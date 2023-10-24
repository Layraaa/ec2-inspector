
<h1 align="center">
  <br>
  <a href="https://github.com/Layraaa/ec2-inspector"><img src="https://github-production-user-asset-6210df.s3.amazonaws.com/107069518/275801284-70e16be3-7481-4fe6-958a-79397ac02420.png" alt="EC2 Inspector" width="200"></a>
  <br>
  EC2 Inspector v1.0
</h1>

<h4 align="center">:mag: EC2 Inspector is a tool that allows you extract data and monitor EC2 instances from AWS :mag:</h4>

<p align="center">
  <a href="#description">Description</a> •
  <a href="#key-features">Key Features</a> •
  <a href="#download-and-install">Download and Install</a>
</p>

<div align="center">
  <a href="https://github.com/Layraaa/ec2-inspector"><img src="https://user-images.githubusercontent.com/107069518/270310929-b6817790-975b-42e3-92fa-7ee92bb5001d.png" alt="EC2 Inspector screenshot"></a>
  <a href="https://www.youtube.com/watch?v=zMIG6ueuM8w">Video here</a>
</div>

## Description

EC2 Inspector is a monitoring and forensic analysis tool. With this tool you will be able to extract data from your EC2 instances, monitor them and export this information with graphics, JSON, Excel, CSV... You will be able to create users and give permissions to use different AWS profiles created on the system, and these users could extract data from a comfortable graphical interface. You don't need to share your credentials to other users for inspect a cloud environment

## Key Features

* Create users and allow to use AWS profiles in system
* Protect users access with Captcha and 2FA
* Generate and export graphics about EC2 instances data in a region
* Collect and export general data from EC2 instances, as for example:
  - General data: instance type, image id, status, launch time...
  - Security Groups: group name, inbound rules, outbound rules...
  - Network: IP addresses, network interfaces, VPC data, subnet data...
  - Storage: Data from block device mappings
  - Tags
* Send commands to EC2 Instances (Linux instances only) and extract data of:
  - Users connected currently
  - Current connections
  - Packages installed in the system
  - Services details
  - Processes data
* Monitor EC2 Instances (Linux instances only):
  - Get data in real time of CPU, RAM, connections, login failed access and I/O reads/writes per process
  - Get notified when:
    - CPU/RAM reach to 90% of use
    - An user connect/disconnect
    - A group/user is added, deleted or modified
    - Something is being mounted/unmounted
    - It's detected a lot of failed login access from the same IP address
    - A service state changes, or when a new services is detected or a services is not detected anymore
* Export data and history from monitored EC2 Instances


## Download and install

To clone this tool, you'll need [Git](https://git-scm.com) installed. From your command line:

```bash
# sudo su
# git clone https://github.com/Layraaa/ec2-inspector
# cd ec2-inspector
# python3 -m venv env
# source env/bin/activate
# pip3 install -r requeriments.txt
# gunicorn -w 12 --preload -b 0.0.0.0:5000 run:app
```
---
