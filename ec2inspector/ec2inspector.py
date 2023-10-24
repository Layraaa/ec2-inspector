import io
from io import BytesIO
import json
import base64
import warnings
from flask import session, request, jsonify, send_file
from PIL import Image
from .security import login_required
from .database.models import db, Graphics, Export
from sqlalchemy.orm.attributes import flag_modified
import boto3
from botocore.session import Session as BotocoreSession
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import pandas as pd
import matplotlib.patches as mpatches
import matplotlib.ticker as ticker
import distro
import platform
import socket
import urllib
from datetime import datetime, timezone, timedelta
import tzlocal
import zipfile
import hashlib

def init_ec2inspector(app):

  # EC2 INSPECTOR FUNCTIONS

  def get_boto3_session(region):

    botocore_session = BotocoreSession()

    botocore_session.set_config_variable('credentials_file', session.get('credentials_file'))
    botocore_session.set_config_variable('config_file', session.get('config_file'))
    botocore_session.set_config_variable('region', region)
    botocore_session.set_config_variable('profile', session.get('selectedprofile'))

    boto3_session = boto3.Session(botocore_session=botocore_session)
    return boto3_session
  
  @app.route("/get_graphics", methods=["GET"])
  @login_required
  def get_graphics():
      region = request.args.get("region")
      
      # Create a resource and get EC2 instances
      boto3_session = get_boto3_session(region)
  
      ec2 = boto3_session.resource('ec2', region_name=region)
      instances = ec2.instances.filter()
  
      # Save data in a list
      data = []
      for instance in instances:
        security_groups = str([sg["GroupName"] for sg in instance.security_groups])[1:-1].replace("'","")
        data.append({
          'Availability Zones': instance.placement['AvailabilityZone'],
          'Status': instance.state['Name'],
          'AMI IDs': instance.image_id,
          'Security Groups': security_groups,
          'Instance Types': instance.instance_type,
          'VPCs': instance.vpc_id,
          'Subnets': instance.subnet_id
        })
      
      if len(data) != 0:
          keys = data[0].keys()
          graphics = {}
  
          for key in keys:
  
              # Get data and count data
              series = pd.Series([d[key] for d in data])
              counts = series.value_counts()
              
              if not counts.empty:
                 
                # Create graphic
                counts.plot(kind='bar') #bar/barh/pie, color = "lightblue", ec="red"
  
                # Put titles and rotate text
                plt.title('Summary of ' + key)
                plt.ylabel('Number of instances', labelpad=20)
                plt.xticks(rotation=45, ha="right")
  
                # Create legend text and create area
                annotation_text = "\n".join(f'{label}: {count}' for label, count in counts.items())
                annotation_patch = mpatches.Patch(color='none', label=annotation_text)
  
                # Add legend to graphic with the area
                plt.legend(handles=[annotation_patch], handlelength=0, handletextpad=0, borderaxespad=0, bbox_to_anchor=(1.05, 1), loc='upper left', borderpad=0.5, edgecolor='black')
            
                # Create a locator that locate only integer number in Y label instead decimal and integer numbers
                locator = ticker.MaxNLocator(integer=True)
                plt.gca().yaxis.set_major_locator(locator)
  
                # Render graphic
                with warnings.catch_warnings():
                  warnings.simplefilter("ignore")
                  plt.tight_layout()
  
                # Save graphic in a png file
                img = io.BytesIO()
                plt.savefig(img, format='png')
                img.seek(0)

                # Binary data
                binary_data = img.getvalue()

                existing_row = db.session.query(Graphics).filter_by(id=session['uuid'], title=key, region=region).first()

                if existing_row:
                  existing_row.graphic = binary_data
                else:
                  new_row = Graphics(id=session['uuid'], title=key, region=region, graphic=binary_data)
                  db.session.add(new_row)

                db.session.commit()
                
                # Encode graphic
                graphics[f"{key}"] = base64.b64encode(img.getvalue()).decode()
  
                # Close image
                img.close()
                plt.clf()
  
          json_string = json.dumps(graphics)
  
          # Clear data
          data.clear()

          # Send encoded image
          return json_string
      
      else:
          json_nodata = '{"nodata": "nodata"}'
          return json_nodata
      
  @app.route('/get_vpcs', methods=['GET'])
  @login_required
  def get_vpcs():

    region = request.args.get("region")
    boto3_session = get_boto3_session(region)
    client = boto3_session.client('ec2', region_name=region)
    response = client.describe_vpcs()
    vpcs = [vpc['VpcId'] for vpc in response['Vpcs']]
  
    return jsonify(vpcs)
  
  @app.route('/get_subnets', methods=['GET'])
  @login_required
  def get_subnets():

    region = request.args.get("region")
    boto3_session = get_boto3_session(region)
    vpc_id = request.args.get("vpc")
    resource = boto3_session.resource('ec2', region_name=region)
    vpc = resource.Vpc(vpc_id)
    subnets = [{'id': subnet.id} for subnet in vpc.subnets.all()]
  
    return jsonify(subnets)
  
  @app.route('/get_instances', methods=['GET'])
  @login_required
  def get_instances():
      
    region = request.args.get("region")
    boto3_session = get_boto3_session(region)
    subnet_id = request.args.get("subnet")
    resource = boto3_session.resource('ec2', region_name=region)
    subnet = resource.Subnet(subnet_id)
    instances = [{'id': instance.id} for instance in subnet.instances.all()]
  
    return jsonify(instances)
  
  @app.route('/get_data', methods=['GET'])
  @login_required
  def get_data():

    region = request.args.get("region")
    boto3_session = get_boto3_session(region)
    query = request.args.get("query")
    id = request.args.get("id")
    data = {}
    instances = {}

    # Serialize datetime function
    def serialize_datetime(obj):
      if isinstance(obj, datetime):
        return obj.isoformat()
      elif isinstance(obj, dict):
        return {key: serialize_datetime(value) for key, value in obj.items()}
      elif isinstance(obj, list):
        return [serialize_datetime(item) for item in obj]
      else:
        return obj
  
    if query.startswith("ec2-instances"):
      action = query.split("ec2-instances-")[1]
      match action:
        case "all":
          client=boto3_session.client(service_name='ec2')
          all_regions=client.describe_regions()
          regions = [region['RegionName'] for region in all_regions['Regions']]
  
          # Loop all regions
          for region in regions:
            ec2_client = boto3_session.client('ec2', region_name=region)
            response = ec2_client.describe_instances()
  
            instances.setdefault(region, [])
            data.setdefault(region, [])
  
            for reservation in response["Reservations"]:
              for instance in reservation["Instances"]:
  
                instance_data = {
                  'AmiLaunchIndex': instance.get('AmiLaunchIndex', 0),
                  'Architecture': instance.get('Architecture', ""),
                  'BlockDeviceMappings': instance.get('BlockDeviceMappings', []),
                  'ImageId': instance.get('ImageId', ""),
                  'InstanceId': instance.get('InstanceId', ""),
                  'InstanceType': instance.get('InstanceType', ""),
                  'LaunchTime': instance.get('LaunchTime', None),
                  'NetworkInterfaces': instance.get('NetworkInterfaces', []),
                  'Placement': instance.get('Placement', {}).get('AvailabilityZone', "") if instance.get('Placement') else "",
                  'PlatformDetails': instance.get('PlatformDetails', ""),
                  'PrivateDnsName': instance.get('PrivateDnsName', ""),
                  'PrivateIpAddress': instance.get('PrivateIpAddress', ""),
                  'PublicDnsName': instance.get('PublicDnsName', ""),
                  'PublicIpAddress': instance.get('PublicIpAddress', ""),
                  'RootDeviceName': instance.get('RootDeviceName', ""),
                  'RootDeviceType': instance.get('RootDeviceType', ""),
                  'SecurityGroups': {sg['GroupName']: sg['GroupId'] for sg in instance.get('SecurityGroups', [])},
                  'State': instance.get('State', {}).get('Name', "") if instance.get('State') else "",
                  'StateTransitionReason': instance.get('StateTransitionReason', ""),
                  'SubnetId': instance.get('SubnetId', ""),
                  'Tags': instance.get('Tags', []),
                  'VpcId': instance.get('VpcId', ""),
                  'Region': instance.get('Placement', {}).get('AvailabilityZone', "")[:-1] if instance.get('Placement') and instance.get('Placement', {}).get('AvailabilityZone') else "",
                }
  
                instances[region].append(instance['InstanceId'])
                data[region].append(instance_data)
  
        case "region":
          ec2_client = boto3_session.client('ec2', region_name=region)
          response = ec2_client.describe_instances()
  
        case "vpc":
          ec2_client = boto3_session.client('ec2', region_name=region)
          response = ec2_client.describe_instances(Filters=[{'Name': 'vpc-id', 'Values': [id]}])
  
        case "subnet":
          ec2_client = boto3_session.client('ec2', region_name=region)
          response = ec2_client.describe_instances(Filters=[{'Name': 'subnet-id', 'Values': [id]}])
  
        case "instance":
          ec2_client = boto3_session.client('ec2', region_name=region)
          response = ec2_client.describe_instances(InstanceIds=[id])
  
      response_metadata = response['ResponseMetadata']

      # Get database data
      export_row = Export.query.filter_by(id=session['uuid']).first()

      # Check is is None
      if export_row is None:
        export_row = Export(id=session['uuid'], instances={})
        db.session.add(export_row)
      elif export_row.instances is None:
        export_row.instances = {}
  
      for reservation in response["Reservations"]:
        for instance in reservation["Instances"]:

          instance_data = {
            'AmiLaunchIndex': instance.get('AmiLaunchIndex', 0),
            'Architecture': instance.get('Architecture', ""),
            'BlockDeviceMappings': instance.get('BlockDeviceMappings', []),
            'ImageId': instance.get('ImageId', ""),
            'InstanceId': instance.get('InstanceId', ""),
            'InstanceType': instance.get('InstanceType', ""),
            'LaunchTime': instance.get('LaunchTime', None),
            'NetworkInterfaces': instance.get('NetworkInterfaces', []),
            'Placement': instance.get('Placement', {}).get('AvailabilityZone', "") if instance.get('Placement') else "",
            'PlatformDetails': instance.get('PlatformDetails', ""),
            'PrivateDnsName': instance.get('PrivateDnsName', ""),
            'PrivateIpAddress': instance.get('PrivateIpAddress', ""),
            'PublicDnsName': instance.get('PublicDnsName', ""),
            'PublicIpAddress': instance.get('PublicIpAddress', ""),
            'RootDeviceName': instance.get('RootDeviceName', ""),
            'RootDeviceType': instance.get('RootDeviceType', ""),
            'SecurityGroups': {sg['GroupName']: sg['GroupId'] for sg in instance.get('SecurityGroups', [])},
            'State': instance.get('State', {}).get('Name', "") if instance.get('State') else "",
            'StateTransitionReason': instance.get('StateTransitionReason', ""),
            'SubnetId': instance.get('SubnetId', ""),
            'Tags': instance.get('Tags', []),
            'VpcId': instance.get('VpcId', ""),
            'Region': instance.get('Placement', {}).get('AvailabilityZone', "")[:-1] if instance.get('Placement') and instance.get('Placement', {}).get('AvailabilityZone') else "",
          }
  
          instances.setdefault(region, [])
          data.setdefault(region, [])
          instances[region].append(instance['InstanceId'])
          data[region].append(instance_data)
          
          # Serializate data, add to datanase and commit
          json_data = serialize_datetime(instance_data)
          export_row.instances[instance_data['InstanceId']] = json_data
          flag_modified(export_row, "instances")
        
      db.session.commit()

      metadata = {
        'HTTPHeaders' : response_metadata['HTTPHeaders']['date'],
        'HTTPStatusCode' : response_metadata['HTTPStatusCode'],
        'RequestId' : response_metadata['RequestId'],
        'RetryAttempts' : response_metadata['RetryAttempts']
      }
  
      return jsonify(instances, data, metadata)
  
    else: # Aditional data (In response data is [0], because it's builded for 1 item per petition)
        
        ids = {}
        ids.setdefault(region, [])
        data.setdefault(region, [])
  
        match query:
            case "ec2-ami":
              ec2_client = boto3_session.client('ec2', region_name=region)
              describe_images = ec2_client.describe_images(ImageIds=[id])
              #describe_image_attribute = ec2_client.describe_image_attribute(ImageId=[id])
  
              response_data = describe_images['Images'][0]
              response_metadata = describe_images['ResponseMetadata']
  
              images_data = {
                'Architecture': response_data.get('Architecture', ""),
                'BlockDeviceMappings': response_data.get('BlockDeviceMappings', []),
                'BootMode': response_data.get('BootMode', ""),
                'CreationDate': response_data.get('CreationDate', ""),
                'DeprecationTime': response_data.get('DeprecationTime', ""),
                'Description': response_data.get('Description', ""),
                'EnaSupport': response_data.get('EnaSupport', False),
                'Hypervisor': response_data.get('Hypervisor', ""),
                'ImageLocation': response_data.get('ImageLocation', ""),
                'ImageOwnerAlias': response_data.get('ImageOwnerAlias', ""),
                'ImageType': response_data.get('ImageType', ""),
                'ImdsSupport': response_data.get('ImdsSupport', ""),
                'KernelId': response_data.get('KernelId', ""),
                'Name': response_data.get('Name', ""),
                'OwnerId': response_data.get('OwnerId', ""),
                'PlatformDetails': response_data.get('PlatformDetails', ""),
                'Public': response_data.get('Public', False),
                'RamdiskId': response_data.get('RamdiskId', ""),
                'RootDeviceName': response_data.get('RootDeviceName', ""),
                'RootDeviceType': response_data.get('RootDeviceType', ""),
                'SriovNetSupport': response_data.get('SriovNetSupport', ""),
                'State': response_data.get('State', ""),
                'StateReason': response_data.get('StateReason', ""),
                'Tags': response_data.get('Tags', []),
                'VirtualizationType': response_data.get('VirtualizationType', ""),
                'TpmSupport': response_data.get('TpmSupport', ""),
              }
  
              ids[region].append(id)
              data[region].append(images_data)

              # Get database data
              export_row = Export.query.filter_by(id=session['uuid']).first()

              # Check is is None
              if export_row is None:
                export_row = Export(id=session['uuid'], images={})
                db.session.add(export_row)
              elif export_row.images is None:
                export_row.images = {}
              
              # Serializate data, add to datanase and commit
              json_data = serialize_datetime(images_data)
              export_row.images[id] = json_data
              flag_modified(export_row, "images")
              db.session.commit()
  
            case "ec2-volume":
              ec2_client = boto3_session.client('ec2', region_name=region)
              describe_volumes = ec2_client.describe_volumes(VolumeIds=[id])
              #describe_volume_status = ec2_client.describe_volume_status(VolumeIds=[id])
              #describe_volumes_modifications = ec2_client.describe_volumes_modifications(VolumeIds=[id])
  
              volumes_data = describe_volumes['Volumes'][0]
              response_metadata = describe_volumes['ResponseMetadata']
  
              volume_data = {
                'Attachments': volumes_data.get('Attachments', []),
                'AvailabilityZone': volumes_data.get('AvailabilityZone', ""),
                'CreateTime': volumes_data.get('CreateTime', None),
                'Encrypted': volumes_data.get('Encrypted', False),
                'KmsKeyId': volumes_data.get('KmsKeyId', ""),
                'OutpostArn': volumes_data.get('OutpostArn', ""),
                'Size': volumes_data.get('Size', 0),
                'SnapshotId': volumes_data.get('SnapshotId', ""),
                'State': volumes_data.get('State', ""),
                'VolumeId': volumes_data.get('VolumeId', ""),
                'Iops': volumes_data.get('Iops', 0),
                'Tags': volumes_data.get('Tags', []),
                'VolumeType': volumes_data.get('VolumeType', ""),
                'FastRestored': volumes_data.get('FastRestored', False),
                'MultiAttachEnabled': volumes_data.get('MultiAttachEnabled', False),
                'Throughput': volumes_data.get('Throughput', 0),
              }
  
              ids[region].append(id)
              data[region].append(volume_data)

              # Get database data
              export_row = Export.query.filter_by(id=session['uuid']).first()

              # Check is is None
              if export_row is None:
                export_row = Export(id=session['uuid'], volumes={})
                db.session.add(export_row)
              elif export_row.volumes is None:
                export_row.volumes = {}
              
              # Serializate data, add to datanase and commit
              json_data = serialize_datetime(volume_data)
              export_row.volumes[id] = json_data
              flag_modified(export_row, "volumes")
              db.session.commit()
  
            case "ec2-securitygroup":
              ec2_client = boto3_session.client('ec2', region_name=region)
              describe_security_groups = ec2_client.describe_security_groups(GroupIds=[id])
              describe_security_group_rules = ec2_client.describe_security_group_rules(Filters=[{'Name': 'group-id', 'Values':[id]}])
  
              security_groups_data = describe_security_groups['SecurityGroups'][0]
              security_group_rules_data = describe_security_group_rules
  
              response_metadata = describe_security_group_rules['ResponseMetadata']
  
              securitygroup_data = {
                'Description': security_groups_data.get('Description', ""),
                'GroupName': security_groups_data.get('GroupName', ""),
                'OwnerId': security_groups_data.get('OwnerId', ""),
                'VpcId': security_groups_data.get('VpcId', ""),
                'Tags': security_groups_data.get('Tags', []),
                'SecurityGroupRules': security_group_rules_data.get('SecurityGroupRules', ""),
              }
  
              ids[region].append(id)
              data[region].append(securitygroup_data)

              # Get database data
              export_row = Export.query.filter_by(id=session['uuid']).first()

              # Check is is None
              if export_row is None:
                export_row = Export(id=session['uuid'], security_groups={})
                db.session.add(export_row)
              elif export_row.security_groups is None:
                export_row.security_groups = {}
              
              # Serializate data, add to datanase and commit
              json_data = serialize_datetime(securitygroup_data)
              export_row.security_groups[id] = json_data
              flag_modified(export_row, "security_groups")
              db.session.commit()
  
            case "ec2-networkinterface":
              ec2_client = boto3_session.client('ec2', region_name=region)
              describe_network_interfaces = ec2_client.describe_network_interfaces(NetworkInterfaceIds=[id])
              #describe_network_interface_permissions = ec2_client.describe_network_interface_permissions(NetworkInterfaceIds=[id])
  
              response_data_network_interfaces = describe_network_interfaces['NetworkInterfaces'][0]
              #response_network_interface_permissions = describe_network_interface_permissions
              response_metadata = describe_network_interfaces['ResponseMetadata']
  
              network_interfaces_data = {
                'Association': response_data_network_interfaces.get('Association', ""),
                'Attachment': response_data_network_interfaces.get('Attachment', ""),
                'AvailabilityZone': response_data_network_interfaces.get('AvailabilityZone', ""),
                'DenyAllIgwTraffic': response_data_network_interfaces.get('DenyAllIgwTraffic', ""),
                'Description': response_data_network_interfaces.get('Description', ""),
                'Groups': response_data_network_interfaces.get('Groups', ""),
                'InterfaceType': response_data_network_interfaces.get('InterfaceType', ""),
                'Ipv4Prefixes': response_data_network_interfaces.get('Ipv4Prefixes', ""),
                'Ipv6Addresses': response_data_network_interfaces.get('Ipv6Addresses', ""),
                'Ipv6Native': response_data_network_interfaces.get('Ipv6Native', ""),
                'Ipv6Prefixes': response_data_network_interfaces.get('Ipv6Prefixes', ""),
                'MacAddress': response_data_network_interfaces.get('MacAddress', ""),
                'OutpostArn': response_data_network_interfaces.get('OutpostArn', ""),
                'OwnerId': response_data_network_interfaces.get('OwnerId', ""), 
                'PrivateDnsName': response_data_network_interfaces.get('PrivateDnsName', ""),
                'PrivateIpAddress': response_data_network_interfaces.get('PrivateIpAddress', ""),
                'PrivateIpAddresses': response_data_network_interfaces.get('PrivateIpAddresses', ""),
                'RequesterId': response_data_network_interfaces.get('RequesterId', ""),
                'RequesterManaged': response_data_network_interfaces.get('RequesterManaged', ""),
                'SourceDestCheck': response_data_network_interfaces.get('SourceDestCheck', ""),
                'Status': response_data_network_interfaces.get('Status', ""),
                'SubnetId': response_data_network_interfaces.get('SubnetId', ""),
                'Tags': response_data_network_interfaces.get('TagSet', []),
                'VpcId': response_data_network_interfaces.get('VpcId', "")
              }
  
              ids[region].append(id)
              data[region].append(network_interfaces_data)

              # Get database data
              export_row = Export.query.filter_by(id=session['uuid']).first()

              # Check is is None
              if export_row is None:
                export_row = Export(id=session['uuid'], network_interfaces={})
                db.session.add(export_row)
              elif export_row.network_interfaces is None:
                export_row.network_interfaces = {}
              
              # Serializate data, add to datanase and commit
              json_data = serialize_datetime(network_interfaces_data)
              export_row.network_interfaces[id] = json_data
              flag_modified(export_row, "network_interfaces")
              db.session.commit()
  
            case "ec2-subnet":
              ec2_client = boto3_session.client('ec2', region_name=region)
              describe_subnets = ec2_client.describe_subnets(SubnetIds=[id])
  
              response_data = describe_subnets['Subnets'][0]
              response_metadata = describe_subnets['ResponseMetadata']
  
              subnet_data = {
                'AssignIpv6AddressOnCreation': response_data.get('AssignIpv6AddressOnCreation', ""),
                'AvailabilityZone': response_data.get('AvailabilityZone', ""),
                'AvailabilityZoneId': response_data.get('AvailabilityZoneId', ""),
                'AvailableIpAddressCount': response_data.get('AvailableIpAddressCount', ""),
                'CidrBlock': response_data.get('CidrBlock', ""),
                'CustomerOwnedIpv4Pool': response_data.get('CustomerOwnedIpv4Pool', ""),
                'DefaultForAz': response_data.get('DefaultForAz', ""),
                'EnableDns64': response_data.get('EnableDns64', ""),
                'EnableLniAtDeviceIndex' : response_data.get('EnableLniAtDeviceIndex', ""),
                'Ipv6CidrBlockAssociationSet': response_data.get('Ipv6CidrBlockAssociationSet', ""),
                'Ipv6Native': response_data.get('Ipv6Native', ""),
                'MapCustomerOwnedIpOnLaunch': response_data.get('MapCustomerOwnedIpOnLaunch', ""),
                'MapPublicIpOnLaunch': response_data.get('MapPublicIpOnLaunch', ""),
                'OwnerId': response_data.get('OwnerId', ""),
                'HostnameType': response_data.get('PrivateDnsNameOptionsOnLaunch', {}).get('HostnameType', ""),
                'EnableResourceNameDnsARecord': response_data.get('PrivateDnsNameOptionsOnLaunch', {}).get('EnableResourceNameDnsARecord', ""),
                'EnableResourceNameDnsAAAARecord': response_data.get('PrivateDnsNameOptionsOnLaunch', {}).get('EnableResourceNameDnsAAAARecord', ""),
                'State': response_data.get('State', ""),
                'SubnetArn': response_data.get('SubnetArn', ""),
                'Tags': response_data.get('Tags', []),
                'VpcId': response_data.get('VpcId', "")
              }
  
              ids[region].append(id)
              data[region].append(subnet_data)

              # Get database data
              export_row = Export.query.filter_by(id=session['uuid']).first()

              # Check is is None
              if export_row is None:
                export_row = Export(id=session['uuid'], subnets={})
                db.session.add(export_row)
              elif export_row.subnets is None:
                export_row.subnets = {}
              
              # Serializate data, add to datanase and commit
              json_data = serialize_datetime(subnet_data)
              export_row.subnets[id] = json_data
              flag_modified(export_row, "subnets")
              db.session.commit()
  
            case "ec2-vpc":
              ec2_client = boto3_session.client('ec2', region_name=region)
              describe_vpcs = ec2_client.describe_vpcs(VpcIds=[id])
  
              response_data = describe_vpcs['Vpcs'][0]
              response_metadata = describe_vpcs['ResponseMetadata']
  
              vpc_data = {
                'CidrBlock': response_data.get('CidrBlock', ""),
                'CidrBlockAssociationSet': response_data.get('CidrBlockAssociationSet', ""),
                'DhcpOptionsId': response_data.get('DhcpOptionsId', ""),
                'Ipv6CidrBlockAssociationSet': response_data.get('Ipv6CidrBlockAssociationSet', ""),
                'InstanceTenancy': response_data.get('InstanceTenancy', ""),
                'IsDefault': response_data.get('IsDefault', ""),
                'OwnerId': response_data.get('OwnerId', ""),
                'State': response_data.get('State', ""),
                'Tags': response_data.get('Tags', [])
              }
  
              ids[region].append(id)
              data[region].append(vpc_data)

              # Get database data
              export_row = Export.query.filter_by(id=session['uuid']).first()

              # Check is is None
              if export_row is None:
                export_row = Export(id=session['uuid'], vpcs={})
                db.session.add(export_row)
              elif export_row.vpcs is None:
                export_row.vpcs = {}
              
              # Serializate data, add to datanase and commit
              json_data = serialize_datetime(vpc_data)
              export_row.vpcs[id] = json_data
              flag_modified(export_row, "vpcs")
              db.session.commit()
  
        metadata = {
          'HTTPHeaders' : response_metadata['HTTPHeaders']['date'],
          'HTTPStatusCode' : response_metadata['HTTPStatusCode'],
          'RequestId' : response_metadata['RequestId'],
          'RetryAttempts' : response_metadata['RetryAttempts']
        }
  
        return jsonify(ids, data, metadata)

  @app.route('/export_data', methods=['POST'])
  @login_required
  def export_data():

    CLIENTDATA = request.get_json().get("clientdata")
    DATABASEDATA = db.session.query(Export).filter_by(id=session['uuid']).first()

    EC2DATA = {
      'Instances' : DATABASEDATA.instances,
      'Images' : DATABASEDATA.images,
      'Network interfaces' : DATABASEDATA.network_interfaces,
      'Security groups' : DATABASEDATA.security_groups,
      'Subnets' : DATABASEDATA.subnets,
      'Vpcs' : DATABASEDATA.vpcs,
      'Volumes' : DATABASEDATA.volumes
    }
    
    JSONEC2DATA = json.dumps(EC2DATA, sort_keys=True)

    EXPORTDATA = {
      'Case data' : {
        'Case Name' : CLIENTDATA['caseName'],
        'Case UUID' : session['uuid'],
        'Time' : {
          'Client' : {
              'Client start time': CLIENTDATA['Client start time'],
              'Client export time': CLIENTDATA['Client export time'],
              'Client timezone': CLIENTDATA['Client timezone'],
              'Client region' : CLIENTDATA['Client region'],
          },
          'Server' : {
              'Server start time': CLIENTDATA['Server start time'],
              'Server export time': (lambda date: date.strftime("%Y-%m-%d %H:%M:%S"))(datetime.now()),
              'Server timezone': (datetime.now(timezone.utc).astimezone().utcoffset() // timedelta(minutes=1)) // 60,
              'Server region' : str(tzlocal.get_localzone()),
          },
        },
        'Analyst information' : {
          'Analyst first name' : CLIENTDATA['firstName'],
          'Analyst last name' : CLIENTDATA['lastName'],
          'EC2 Inspector user': session['username'],
          'Local system user': session['local_user'],
          'AWS Profile': session['selectedprofile'],
        },
        'EC2 Inspector version' : "1.0",
        'Metadata': {
          'Server information': {
            'Ip Address': urllib.request.urlopen('https://ident.me').read().decode('utf8'),
            'Hostname': socket.gethostname(),
            'OS': distro.name(pretty=True),
            'Kernel version': platform.uname().release,
            'Architecture': platform.machine()
          },
          'Data hash': {
            'SHA-256' : hashlib.sha256(JSONEC2DATA.encode()).hexdigest(),
            'SHA-3-256' : hashlib.sha3_256(JSONEC2DATA.encode()).hexdigest(),
            'SHA-512' : hashlib.sha512(JSONEC2DATA.encode()).hexdigest(),
            'SHA-3-512' : hashlib.sha3_512(JSONEC2DATA.encode()).hexdigest(),
          },
        }
      },
      'Data' : EC2DATA
    }

    return EXPORTDATA
  
  @app.route('/export_graphics', methods=['GET'])
  @login_required
  def export_graphics():
    graphics = db.session.query(Graphics).filter_by(id=session['uuid']).all()
    zip_buffer = BytesIO()
    
    with zipfile.ZipFile(zip_buffer, 'a', zipfile.ZIP_DEFLATED, False) as zip_file:
      for graphic in graphics:
        img = Image.open(BytesIO(graphic.graphic))
        img_bytes = BytesIO()
        img.save(img_bytes, format='PNG')
        img_data = img_bytes.getvalue()
        zip_file.writestr(f"{graphic.title}-{graphic.region}.png", img_data)

    zip_buffer.seek(0)
    return send_file(zip_buffer, download_name='graphics-' + (lambda date: date.strftime("%Y-%m-%d %H:%M:%S"))(datetime.now()) + '.zip', as_attachment=True)