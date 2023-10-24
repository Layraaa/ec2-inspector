/* Functions for showssmalert */

const playSound = () => {
    document.getElementById("audio").play();
}

const showssmalert = (instanceid, title, data, alertclass) => {
    // Create div container
    var divElement = document.createElement('div');
    divElement.classList.add('alert', 'alert-' + alertclass, 'alert-dismissible', 'fade', 'show');
    divElement.setAttribute('role', 'alert');

    // Create strong
    var strongElement = document.createElement('strong');
    strongElement.classList.add('informationheader', 'text-center');
    strongElement.textContent = title;
    divElement.appendChild(strongElement);
    
    divElement.appendChild(createElementWithMessage('Date', getactualdatetime()));

    // Create details and summary
    var details = document.createElement('details');
    var summary = document.createElement('summary');

    var strong = document.createElement('strong');
    var span = document.createElement('span');

    strong.innerHTML = "Instance ID: ";
    span.innerHTML = instanceid;
    summary.appendChild(strong);
    summary.appendChild(span);

    details.appendChild(summary);
    details.appendChild(createElementWithMessage('Region', warehouse["Instances"][instanceid]["Region"]));
    details.appendChild(createElementWithMessage('VPC', warehouse["Instances"][instanceid]["VpcId"]));
    details.appendChild(createElementWithMessage('Subnet', warehouse["Instances"][instanceid]["SubnetId"]));
    details.appendChild(createElementWithMessage('IP Address', warehouse["Instances"][instanceid]["PrivateIpAddress"]));

    divElement.appendChild(details);

    // Create hr
    var hrElement = document.createElement('hr');
    hrElement.style.margin = "0.75rem 0";
    hrElement.classList.add('alertline');
    divElement.appendChild(hrElement);

    // Create message containers
    for (var i = 0; i < data.length; i++) {
        divElement.appendChild(createElementWithMessage(data[i][0], data[i][1]));
    }

    // Create button to close alert
    var buttonElement = document.createElement('button');
    buttonElement.setAttribute('type', 'button');
    buttonElement.classList.add('btn-close');
    buttonElement.setAttribute('data-bs-dismiss', 'alert');
    buttonElement.setAttribute('aria-label', 'Close');
    divElement.appendChild(buttonElement);

    // Add container to document
    document.getElementById("alerts").appendChild(divElement);
    playSound();
}

const historysmm = (historydata, token) => {

    AddDataRow({ date: historydata['date'], instance: historydata['instanceid'], event: historydata['event'], details: historydata['details'] });
                                    
    $.ajax({
        url: "/send_data_ssm_history",
        type: "POST",
        headers: {
            "Authorization": "Bearer " + token
        },
        contentType: "application/json",
        data: JSON.stringify({"data": historydata}),
        success: function (data) {},
        error: function (error) {
            console.error(error);
        }
    });
}

const monitorssm = ({ instanceid, region }) => {
  // Constants
  const [values, setValues] = useState({});
  const [isLoading, setLoading] = useState(true);
  const [hostmapElements, setHostmapElements] = useState([]);
  const [usermapElements, setUsermapElements] = useState([]);

  // Fetch data
  useEffect(() => {
    let cancel = false;
    const fetchData = async () => {
        try {
            response = axios.get('/get_data_ssm_monitor', { params: { instanceid: instanceid, region: region } })
            .then(response => {

                const { data, token } = response.data;
                
                const parts = data.split(';');
                const vals = [
                    Number(parts[0]).toFixed(2), // CPU
                    Number(parts[1]).toFixed(2), // RAM
                    parts[2], // w
                    parts[3], // user and groups changes
                    parts[4], // connections
                    parts[5], // mount
                    parts[6], // failed login
                    parts[7], // services in memory
                    parts[8], // all services
                    parts[9], // disk I/O per process
                ];                
                
                if (!cancel) {
                    setValues(values => {
                        if (!values[instanceid]) {
                            // Only get values
                            values[instanceid] = {};
                            values[instanceid].cpu = vals[0];
                            values[instanceid].ram = vals[1];

                            const linesw = vals[2].trim().split("\n").filter(line => line.trim() !== '');
                            
                            const arrayw = linesw.map(line => {
                                const [user, tty, ip, hour] = line.trim().split(' ');
                                return {user, tty, ip, hour};
                            });

                            values[instanceid].w = arrayw;

                            values[instanceid].users = vals[3];

                            let lines = vals[4].split('\n').filter(line => line.trim() !== '');

                            let counts = [{}, {}, {}, {}];

                            for (let i = 0; i < lines.length; i++) {
                                let cols = lines[i].split(' ');

                                for (let j = 0; j < cols.length; j++) {
                                    if (!counts[j][cols[j]]) {
                                        counts[j][cols[j]] = 0;
                                    }
                                    counts[j][cols[j]]++;
                                }
                            }

                            values[instanceid].connections = counts;

                            values[instanceid].mount = vals[5];

                            const logindata = vals[6].split('\n')
                                .map(line => line.trim())
                                .filter(line => line)
                                .map(line => {
                                    const [user, terminal, host, time] = line.split(',');
                                    const [startTime, endTime] = time.split(' - ');
                                    return { user, terminal, host, startTime, endTime };
                                });

                            const userMap = {};
                            const hostMap = {};

                            logindata.forEach(entry => {
                                const userKey = `${entry.user} - ${entry.terminal}`;
                                const hostKey = `${entry.host}`;

                                // Update userMap
                                if (userMap[userKey]) {
                                    userMap[userKey].count++;
                                    if (userMap[userKey].hosts[hostKey]) {
                                        userMap[userKey].hosts[hostKey].count++;
                                        userMap[userKey].hosts[hostKey].timeStamps.push(entry.startTime);
                                    } else {
                                        userMap[userKey].hosts[hostKey] = {
                                            count: 1,
                                            timeStamps: [entry.startTime]
                                        };
                                    }
                                } else {
                                    userMap[userKey] = {
                                        count: 1,
                                        hosts: {
                                            [hostKey]: {
                                                count: 1,
                                                timeStamps: [entry.startTime]
                                            }
                                        }
                                    };
                                }

                                // Update hostMap
                                if (hostMap[hostKey]) {
                                    hostMap[hostKey].count++;
                                    if (hostMap[hostKey].users[userKey]) {
                                        hostMap[hostKey].users[userKey].count++;
                                        hostMap[hostKey].users[userKey].timeStamps.push(entry.startTime);
                                    } else {
                                        hostMap[hostKey].users[userKey] = {
                                            count: 1,
                                            timeStamps: [entry.startTime]
                                        };
                                    }
                                } else {
                                    hostMap[hostKey] = {
                                        count: 1,
                                        users: {
                                            [userKey]: {
                                                count: 1,
                                                timeStamps: [entry.startTime]
                                            }
                                        }
                                    };
                                }
                            });
                            
                            values[instanceid].logins = {};
                            values[instanceid].logins.usermap = userMap;
                            values[instanceid].logins.hostmap = hostMap;
                            
                            values[instanceid].services = vals[7];
                            values[instanceid].allservices = vals[8];
                            
                            values[instanceid].diskuserperprocess = vals[9]
                                .split('\n')
                                .filter(line => line.trim() !== '')
                                .map(line => line.split(/\s+/));
                            
                        } else {
                            
                            // Check CPU
                            if (vals[0] >= 90){
                                if (values[instanceid].cpu < 90){

                                    const historydata = {
                                        'date' : getactualfulldatetime(),
                                        'instanceid' : instanceid,
                                        'event' : "CPU is over 90%!",
                                        'details' : 'CPU value: ' + vals[0]
                                    };

                                    showssmalert(instanceid, "CPU is over 90%!", [["CPU value", vals[0]]], "danger");
                                    historysmm(historydata, token);

                                }
                            }
                            values[instanceid].cpu = vals[0];

                            // Check RAM
                            if (vals[1] >= 90){
                                if (values[instanceid].ram < 90){

                                    const historydata = {
                                        'date' : getactualfulldatetime(),
                                        'instanceid' : instanceid,
                                        'event' : "RAM is over 90%!",
                                        'details' : 'RAM value: ' + vals[1]
                                    };

                                    showssmalert(instanceid, "RAM is over 90%!", [["RAM value", vals[1]]], "danger");
                                    historysmm(historydata, token);
                                }
                            }
                            values[instanceid].ram = vals[1];

                            // Check connections
                            let lines = vals[4].split('\n').filter(line => line.trim() !== '');

                            let counts = [{}, {}, {}, {}];

                            for (let i = 0; i < lines.length; i++) {
                                let cols = lines[i].split(' ');

                                for (let j = 0; j < cols.length; j++) {
                                    if (!counts[j][cols[j]]) {
                                        counts[j][cols[j]] = 0;
                                    }
                                    counts[j][cols[j]]++;
                                }
                            }

                            values[instanceid].connections = counts;

                            // Check w
                            const linesw = vals[2].trim().split("\n").filter(line => line.trim() !== '');
                            
                            const arrayw = linesw.map(line => {
                                const [user, tty, ip, hour] = line.trim().split(' ');
                                return {user, tty, ip, hour};
                            });

                            let prevValues = values[instanceid].w;
                            let currentValues = arrayw;
                            
                            prevValues = prevValues.filter(item => item.user.trim() !== "");
                            currentValues = currentValues.filter(item => item.user.trim() !== "");

                            let prevUsers = new Set(prevValues.map(user => user.user));
                            let currentUsers = new Set(currentValues.map(user => user.user));

                            // Find new connections
                            let addedUsers = [...currentUsers].filter(user => !prevUsers.has(user));

                            // Show new connections
                                if (addedUsers.length > 0) {
                                addedUsers.forEach(user => {
                                    let userInfo = currentValues.find(info => info.user === user);

                                    const historydata = {
                                        'date' : getactualfulldatetime(),
                                        'instanceid' : instanceid,
                                        'event' : "A new connected user has been detected",
                                        'details' : 'User: ' + user + ', IP Address: ' + userInfo.ip + ', Terminal: ' + userInfo.tty
                                    };

                                    showssmalert(instanceid, "A new connected user has been detected", [["User", user], ["IP Address", userInfo.ip], ["Terminal", userInfo.tty]], "danger");
                                    
                                    historysmm(historydata, token);
                                });
                            }

                            // Find new disconnections
                            let removedUsers = [...prevUsers].filter(user => !currentUsers.has(user));

                            // Show new disconnections
                            if (removedUsers.length > 0) {
                                removedUsers.forEach(user => {
                                    let userInfo = prevValues.find(info => info.user === user);

                                    const historydata = {
                                        'date' : getactualfulldatetime(),
                                        'instanceid' : instanceid,
                                        'event' : "A new disconnected user has been detected",
                                        'details' : 'User: ' + user + ', IP Address: ' + userInfo.ip + ', Terminal: ' + userInfo.tty
                                    };

                                    showssmalert(instanceid, "A disconnected user has been detected", [["User", user], ["IP Address", userInfo.ip], ["Terminal", userInfo.tty]], "danger");
                                    historysmm(historydata, token);

                                });
                            };

                            values[instanceid].w = arrayw;

                            // Check users

                            let oldRecords = values[instanceid].users.split('\n');
                            let newRecords = vals[3].split('\n');

                            oldRecords = oldRecords.filter(record => record.trim() !== '').map(record => record.split(','));
                            newRecords = newRecords.filter(record => record.trim() !== '').map(record => record.split(','));
    
                            for (let i = 0; i < newRecords.length; i++) {

                                let oldRecord = oldRecords[i];
                                let newRecord = newRecords[i];

                                if (oldRecord && oldRecord.join(',') === newRecord.join(',')) {
                                    continue;
                                }

                                let changeType = newRecord[0];
                                let dayAndTime = newRecord[1];
                                let ip = newRecord[2];
                                let alteredElement = newRecord[3];

                                let description;
                                switch (changeType) {
                                    case "useradd":
                                        let uid = newRecord[4];
                                        let gid = newRecord[5];
                                        let directory = newRecord[6];
                                        let shell = newRecord[7];
                                        
                                        const historydata_1 = {
                                            'date' : getactualfulldatetime(),
                                            'instanceid' : instanceid,
                                            'event' : "An user has been created",
                                            'details' : 'User name: ' + alteredElement + ', IP Address: ' + ip + ', Creation date: ' + dayAndTime + ', UID: ' + uid + ', GID: ' + gid + ', Directory: ' + directory
                                        };

                                        showssmalert(instanceid, "An user has been created", [["User name", alteredElement], ["IP Address", ip], ["Creation date", dayAndTime], ["UID", uid], ["GID", gid], ["Directory", directory], ["Shell", shell]],  "info");
                                        historysmm(historydata_1, token);

                                        break;
                                    case "groupadd":
                                        let gidGroup = newRecord[4];

                                        const historydata_2 = {
                                            'date' : getactualfulldatetime(),
                                            'instanceid' : instanceid,
                                            'event' : "A group has been created",
                                            'details' : 'Group name: ' + alteredElement + ', IP Address: ' + ip + ', Creation date: ' + dayAndTime + ', GID: ' + gidGroup
                                        };

                                        showssmalert(instanceid, "A group has been created", [["Group name", alteredElement], ["IP Address", ip], ["Creation date", dayAndTime], ["GID", gidGroup]],  "info");
                                        historysmm(historydata_2, token);

                                        break;
                                    case "usermod":
                                        description = newRecord.slice(4).join(', ');

                                        const historydata_3 = {
                                            'date' : getactualfulldatetime(),
                                            'instanceid' : instanceid,
                                            'event' : "An user has been modified",
                                            'details' : 'User name: ' + alteredElement + ', IP Address: ' + ip + ', Modification date: ' + dayAndTime + ', Description: ' + description
                                        };

                                        showssmalert(instanceid, "An user has been modified", [["User name", alteredElement], ["IP Address", ip], ["Modification date", dayAndTime], ["Description", description]],  "info");
                                        historysmm(historydata_3, token);

                                        break;
                                    case "groupmod":
                                        description = newRecord.slice(3).join(', ');

                                        const historydata_4 = {
                                            'date' : getactualfulldatetime(),
                                            'instanceid' : instanceid,
                                            'event' : "A group has been modified",
                                            'details' : 'IP Address: ' + ip + ', Modification date: ' + dayAndTime + ', Description: ' + description
                                        };

                                        showssmalert(instanceid, "A group has been modified", [["IP Address", ip], ["Modification date", dayAndTime], ["Description", description]],  "info");
                                        historysmm(historydata_4, token);

                                        break;
                                    case "userdel":
                                        description = newRecord.slice(4).join(', ');

                                        const historydata_5 = {
                                            'date' : getactualfulldatetime(),
                                            'instanceid' : instanceid,
                                            'event' : "An user has been deleted",
                                            'details' : 'User name: ' + alteredElement +', IP Address: ' + ip + ', Delete date: ' + dayAndTime + ', Description: ' + description
                                        };

                                        showssmalert(instanceid, "An user has been deleted", [["User name", alteredElement], ["IP Address", ip], ["Delete date", dayAndTime], ["Description", description]],  "info");
                                        historysmm(historydata_5, token);

                                        break;
                                    case "groupdel":
                                        description = newRecord.slice(4).join(', ');

                                        const historydata_6 = {
                                            'date' : getactualfulldatetime(),
                                            'instanceid' : instanceid,
                                            'event' : "A group has been deleted",
                                            'details' : 'Group name: ' + alteredElement +', IP Address: ' + ip + ', Delete date: ' + dayAndTime + ', Description: ' + description
                                        };

                                        showssmalert(instanceid, "A group has been deleted", [["Group name", alteredElement], ["IP Address", ip], ["Delete date", dayAndTime], ["Description", description]],  "info");
                                        historysmm(historydata_6, token);

                                        break;
                                    default:
                                        description = newRecord.slice(4).join(', ');
                                }

                            }

                            values[instanceid].users = vals[3];

                            // Check mount

                            function parseMountOutput(output) {
                                const mountLines = output.split('\n');
                                let parsedOutput = {};

                                mountLines.forEach((line) => {
                                    if(line) {
                                        let parts = line.split(' ');
                                        let name = parts[0];
                                        let directory = parts[1];
                                        let type = parts[2];
                                        let details = parts.slice(3).join(' ');

                                        parsedOutput[line] = { name, directory, type, details };
                                    }
                                });

                                return parsedOutput;
                            }

                            let oldMounts = parseMountOutput(values[instanceid].mount);
                            let newMounts = parseMountOutput(vals[5]);

                            let oldSet = new Set(Object.keys(oldMounts));
                            let newSet = new Set(Object.keys(newMounts));

                            let addedMounts = [...newSet].filter(x => !oldSet.has(x));
                            let removedMounts = [...oldSet].filter(x => !newSet.has(x));

                            addedMounts.forEach((mount) => {

                                const historydata = {
                                    'date' : getactualfulldatetime(),
                                    'instanceid' : instanceid,
                                    'event' : "New mount detected",
                                    'details' : 'Name: ' + newMounts[mount]["name"] +', Type: ' + newMounts[mount]["type"] + ', Directory: ' + newMounts[mount]["directory"] + ', Details: ' + newMounts[mount]["details"]
                                };

                                showssmalert(instanceid, "New mount detected", [["Name", newMounts[mount]["name"]], ["Type", newMounts[mount]["type"]], ["Directory", newMounts[mount]["directory"]], ["Details", newMounts[mount]["details"]]],  "info");
                                historysmm(historydata, token);

                            });

                            removedMounts.forEach((mount) => {

                                const historydata = {
                                    'date' : getactualfulldatetime(),
                                    'instanceid' : instanceid,
                                    'event' : "Removed mount detected",
                                    'details' : 'Name: ' + oldMounts[mount]["name"] +', Type: ' + oldMounts[mount]["type"] + ', Directory: ' + oldMounts[mount]["directory"] + ', Details: ' + oldMounts[mount]["details"]
                                };

                                showssmalert(instanceid, "Removed mount detected", [["Name", oldMounts[mount]["name"]], ["Type", oldMounts[mount]["type"]], ["Directory", oldMounts[mount]["directory"]], ["Details", oldMounts[mount]["details"]]],  "info");
                                historysmm(historydata, token);

                            });

                            values[instanceid].mount = vals[5];

                            // Check failed logins

                            const logindata = vals[6].split('\n')
                                .map(line => line.trim())
                                .filter(line => line)
                                .map(line => {
                                    const [user, terminal, host, time] = line.split(',');
                                    const [startTime, endTime] = time.split(' - ');
                                    return { user, terminal, host, startTime, endTime };
                                });

                            const userMap = {};
                            const hostMap = {};

                            logindata.forEach(entry => {
                                const userKey = `${entry.user} - ${entry.terminal}`;
                                const hostKey = `${entry.host}`;

                                // Update userMap
                                if (userMap[userKey]) {
                                    userMap[userKey].count++;
                                    if (userMap[userKey].hosts[hostKey]) {
                                        userMap[userKey].hosts[hostKey].count++;
                                        userMap[userKey].hosts[hostKey].timeStamps.push(entry.startTime);
                                    } else {
                                        userMap[userKey].hosts[hostKey] = {
                                            count: 1,
                                            timeStamps: [entry.startTime]
                                        };
                                    }
                                } else {
                                    userMap[userKey] = {
                                        count: 1,
                                        hosts: {
                                            [hostKey]: {
                                                count: 1,
                                                timeStamps: [entry.startTime]
                                            }
                                        }
                                    };
                                }

                                // Update hostMap
                                if (hostMap[hostKey]) {
                                    hostMap[hostKey].count++;
                                    if (hostMap[hostKey].users[userKey]) {
                                        hostMap[hostKey].users[userKey].count++;
                                        hostMap[hostKey].users[userKey].timeStamps.push(entry.startTime);
                                    } else {
                                        hostMap[hostKey].users[userKey] = {
                                            count: 1,
                                            timeStamps: [entry.startTime]
                                        };
                                    }
                                } else {
                                    hostMap[hostKey] = {
                                        count: 1,
                                        users: {
                                            [userKey]: {
                                                count: 1,
                                                timeStamps: [entry.startTime]
                                            }
                                        }
                                    };
                                }
                            });
                            
                            values[instanceid].logins = {};
                            values[instanceid].logins.usermap = userMap;
                            values[instanceid].logins.hostmap = hostMap;
                            
                            // Check services

                            function convertToService(text) {
                                let lines = text.split("\n");
                                let obj = {};
                                for (let line of lines) {
                                    let words = line.split(" ");
                                    let key = words[0];
                                    let value = words.slice(1);
                                    obj[key] = value;
                                }
                                return obj;
                            }

                            let oldServices = convertToService(values[instanceid].services);
                            let newServices = convertToService(vals[7]);

                            for (let key in oldServices) {
                                if (newServices[key] !== undefined) {
                                    for (let i = 0; i < oldServices[key].length; i++) {
                                        if (oldServices[key][i] !== newServices[key][i]) {

                                            const historydata = {
                                                'date' : getactualfulldatetime(),
                                                'instanceid' : instanceid,
                                                'event' : "A service state has been changed",
                                                'details' : 'Service name: ' + key + ', Old state: ' + oldServices[key][i] + ', New state: ' + newServices[key][i]
                                            };

                                            showssmalert(instanceid, "A service state has been changed", [["Service name", key], ["Old state", oldServices[key][i]], ["New state", newServices[key][i]]],  "info");
                                            historysmm(historydata, token);

                                        }
                                    }
                                }
                            }

                            values[instanceid].services = vals[7];
                            
                            // All services
                            
                            let oldAllservices = values[instanceid].allservices.split("\n").filter(line => line.trim() !== "");
                            let newAllservices = vals[8].split("\n").filter(line => line.trim() !== "");
                            
                            for (let service of oldAllservices) {
                                if (!newAllservices.includes(service)) {

                                    const historydata = {
                                        'date' : getactualfulldatetime(),
                                        'instanceid' : instanceid,
                                        'event' : "A service has been uninstalled",
                                        'details' : 'Service name: ' + service
                                    };

                                    showssmalert(instanceid, "A service has been uninstalled", [["Service name", service]], "info");
                                    historysmm(historydata, token);

                                }
                            }
                            
                            for (let service of newAllservices) {
                                if (!oldAllservices.includes(service)) {

                                    const historydata = {
                                        'date' : getactualfulldatetime(),
                                        'instanceid' : instanceid,
                                        'event' : "A service has been installed",
                                        'details' : 'Service name: ' + service
                                    };

                                    showssmalert(instanceid, "A service has been installed", [["Service name", service]], "info");
                                    historysmm(historydata, token);
                                }
                            }

                            values[instanceid].allservices = vals[8];

                            // Check disks (disk I/O per process)

                            values[instanceid].diskuserperprocess = vals[9]
                                .split('\n')
                                .filter(line => line.trim() !== '')
                                .map(line => line.split(/\s+/));
                            
                        }
                        
                        return {...values};
                    });

                    setLoading(false);

                }

            });

        } catch (error) {
            console.error(`Error obtaining data: ${error}`);
        }
    }

    fetchData();

    const interval = setInterval(fetchData, 4000);

    return () => {
        clearInterval(interval);
    };

  }, []);

  const headersw = ["USER", "TTY", "FROM", "LOGIN"]  

  useEffect(() => {
    if (!isLoading && values) {
        let hostmapKeys = Object.keys(values[instanceid].logins.hostmap);
        hostmapKeys.sort((a, b) => values[instanceid].logins.hostmap[b].count - values[instanceid].logins.hostmap[a].count);

        const newHostmapElements = hostmapKeys.flatMap(host => {
            const hostDetails = values[instanceid].logins.hostmap[host];
            let userKeys = Object.keys(hostDetails.users);
            userKeys.sort((a, b) => hostDetails.users[b].count - hostDetails.users[a].count);

            const userElements = userKeys.flatMap(user => {
                const userDetails = hostDetails.users[user];
                const timestampRows = userDetails.timeStamps.map((timestamp, index) => 
                    React.createElement('tr', {key: `timestamp-${index}`, className: "subchild-row", "data-uniqueid": `${host}-${user}`},
                        React.createElement('td', {colSpan: 2}, 'Timestamp: ' + timestamp)
                    )
                );
                return [
                    React.createElement('tr', {key: user, className: "child-row", "data-rowgroup": host},
                        React.createElement('td', {}, `${user}`),
                        React.createElement('td', {}, `${userDetails.count}`)
                    ),
                    ...timestampRows
                ];
            });

            return [
                React.createElement('tr', {key: host, className: "parent-row", "data-rowgroup": host},
                    React.createElement('td', {}, host),
                    React.createElement('td', {}, `${hostDetails.count}`)
                ),
                ...userElements
            ];
        });

        setHostmapElements(newHostmapElements);
    }
}, [values, isLoading])


useEffect(() => {
    if (!isLoading && values) {
        let usermapKeys = Object.keys(values[instanceid].logins.usermap);
        usermapKeys.sort((a, b) => values[instanceid].logins.usermap[b].count - values[instanceid].logins.usermap[a].count);

        const newUsermapElements = usermapKeys.flatMap(user => {
            const userDetails = values[instanceid].logins.usermap[user];
            let hostKeys = Object.keys(userDetails.hosts);
            hostKeys.sort((a, b) => userDetails.hosts[b].count - userDetails.hosts[a].count);

            const hostElements = hostKeys.flatMap(host => {
                const hostDetails = userDetails.hosts[host];
                const timestampRows = hostDetails.timeStamps.map((timestamp, index) => 
                    React.createElement('tr', {key: `timestamp-${index}`, className: "subchild-row", "data-uniqueid": `${user}-${host}`},
                        React.createElement('td', {colSpan: 2}, 'Timestamp: ' + timestamp)
                    )
                );
                return [
                    React.createElement('tr', {key: host, className: "child-row", "data-rowgroup": user},
                        React.createElement('td', {}, `${host}`),
                        React.createElement('td', {}, `${hostDetails.count}`)
                    ),
                    ...timestampRows
                ];
            });

            return [
                React.createElement('tr', {key: user, className: "parent-row", "data-rowgroup": user},
                    React.createElement('td', {}, user),
                    React.createElement('td', {}, `${userDetails.count}`)
                ),
                ...hostElements
            ];
        });

        setUsermapElements(newUsermapElements);
    }
}, [values, isLoading])

  // Create container
  return( isLoading ? React.createElement('h3', { className: 'text-center' }, 'Loading data from ' + instanceid + '...') :
    React.createElement('details', { className: 'row monitorrow' },
        React.createElement('summary', { className: 'col-12 text-center fakeh3' }, "Data from " + instanceid ,
            
        ),
            React.createElement('div', { className: 'col-12'}, 
                React.createElement('div', { style: { 
                background : `linear-gradient(to right, blue ${values[instanceid].cpu}%, transparent ${values[instanceid].cpu}%, transparent 100%) rgb(0, 0, 255, 0.5)`, textShadow : '2px 2px 4px rgba(0, 0, 0, 0.5)', padding : '2px' } }, 
                "CPU: " + `${values[instanceid].cpu}%`
                ),
                React.createElement('div', { style: { 
                background : `linear-gradient(to right, green ${values[instanceid].ram}%, transparent ${values[instanceid].ram}%, transparent 100%) rgb(0, 128, 0, 0.5)`, textShadow : '2px 2px 4px rgba(0, 0, 0, 0.5)', padding : '2px' } }, 
                "RAM: " + `${values[instanceid].ram}%`
                ),
            ),
            ( (values[instanceid].w.length !== 0) ?
                React.createElement('div', { className: 'col-12' },
                    React.createElement('table', { className: 'table table-hover table-bordered' },
                        React.createElement('thead', null,
                            React.createElement('tr', { style: { verticalAlign: 'middle' } }, 
                                headersw?.map((header, index) => 
                                    React.createElement('th', {
                                        key: index
                                    }, header),
                                )
                            )
                        ),
                        React.createElement('tbody', null, 
                            values[instanceid].w.map(({user, tty, ip, hour}, index) => {
                                return React.createElement('tr', { key: index },
                                    React.createElement('td', {}, user),
                                    React.createElement('td', {}, tty),
                                    React.createElement('td', {}, ip),
                                    React.createElement('td', {}, hour)
                                );
                            })
                        )
                    )
                ) : null
            ),
            React.createElement('div', { className: 'row' },
                React.createElement('div', { className: 'col-12' },
                    React.createElement('h3', { className: 'text-center' }, "Connections" )
                ),
                React.createElement('div', { className: 'col-6' },
                    React.createElement('div', { style: { overflowY : "auto", maxHeight : "700px" } },
                        React.createElement('div', null,
                            React.createElement('h4', { className: 'text-center' }, "Source IPs"
                            ),
                            React.createElement('table', { className: 'table' },
                                React.createElement('thead', {},
                                    React.createElement('tr', {},
                                        React.createElement('th', {}, "IP"),
                                        React.createElement('th', {}, "Number of ocurrences")
                                    )
                                ),
                                React.createElement('tbody', {},
                                    Object.entries(values[instanceid].connections[0]).sort((a, b) => b[1] - a[1]).map(([ip, value], index) => {
                                        return React.createElement('tr', { key: index },
                                            React.createElement('td', {}, ip),
                                            React.createElement('td', {}, value)
                                        );
                                    })
                                )
                            )
                        ),
                        React.createElement('div', null,
                            React.createElement('h4', { className: 'text-center' }, "Foreign IPs"
                            ),
                            React.createElement('table', { className: 'table' },
                                React.createElement('thead', {},
                                    React.createElement('tr', {},
                                        React.createElement('th', {}, "IP"),
                                        React.createElement('th', {}, "Number of ocurrences")
                                    )
                                ),
                                React.createElement('tbody', {},
                                    Object.entries(values[instanceid].connections[2]).sort((a, b) => b[1] - a[1]).map(([ip, value], index) => {
                                        return React.createElement('tr', { key: index },
                                            React.createElement('td', {}, ip),
                                            React.createElement('td', {}, value)
                                        );
                                    })
                                )
                            )
                        ),
                        React.createElement('div', null,
                            React.createElement('h4', { className: 'text-center' }, "Foreign ports"
                            ),
                            React.createElement('table', { className: 'table' },
                                React.createElement('thead', {},
                                    React.createElement('tr', {},
                                        React.createElement('th', {}, "Port"),
                                        React.createElement('th', {}, "Number of ocurrences")
                                    )
                                ),
                                React.createElement('tbody', {},
                                    Object.entries(values[instanceid].connections[3]).sort((a, b) => b[1] - a[1]).map(([port, value], index) => {
                                        return React.createElement('tr', { key: index },
                                            React.createElement('td', {}, port),
                                            React.createElement('td', {}, value)
                                        );
                                    })
                                )
                            )
                        )
                    )
                ),
                React.createElement('div', { className: 'col-6' },
                    React.createElement('div', { style: { overflowY : "auto", maxHeight : "700px" } },
                        React.createElement('h4', { className: 'text-center' }, "Source ports"
                        ),
                        React.createElement('table', { className: 'table' },
                            React.createElement('thead', {},
                                React.createElement('tr', {},
                                    React.createElement('th', {}, "Port"),
                                    React.createElement('th', {}, "Number of ocurrences")
                                )
                            ),
                            React.createElement('tbody', {},
                                Object.entries(values[instanceid].connections[1]).sort((a, b) => b[1] - a[1]).map(([port, value], index) => {
                                    return React.createElement('tr', { key: index },
                                        React.createElement('td', {}, port),
                                        React.createElement('td', {}, value)
                                    );
                                })
                            )
                        )
                    )
                ),
                
            ),
            ( (Object.keys(usermapElements).length !== 0 || Object.keys(hostmapElements).length !== 0) ?
                React.createElement('div', { className: 'row' },    
                    React.createElement('div', { className: 'col-12' },
                        React.createElement('h3', { className: 'text-center' }, "Failed logins" )
                    ),
                    React.createElement('div', { className: 'col-6', style: { overflowY : "auto", maxHeight : "700px" } },
                        React.createElement('table', { className: 'table table-bordered' },
                            React.createElement('thead', null,
                                React.createElement('tr', null,
                                    React.createElement('th', null, 'Host',),
                                    React.createElement('th', null, 'Number of tries',)
                                ),
                            ),
                            React.createElement('tbody', null,
                                ...hostmapElements
                            ),
                        ),
                    ),
                    React.createElement('div', { className: 'col-6', style: { overflowY : "auto", maxHeight : "700px" } },
                        React.createElement('table', { className: 'table table-bordered' },
                            React.createElement('thead', null,
                                React.createElement('tr', null,
                                    React.createElement('th', null, 'User',),
                                    React.createElement('th', null, 'Number of tries',)
                                ),
                            ),
                            React.createElement('tbody', null,
                                ...usermapElements
                            ),
                        ),
                    )
                ) : null
            ),
            React.createElement('hr', { className: 'ssmhr' }),
            React.createElement('div', { className: 'row' },
                React.createElement('div', { className: 'col-12', style: { overflowY : "auto", maxHeight : "700px" } },
                    React.createElement('h3', { className: 'text-center' }, "I/O reads/writes per process" ),
                    React.createElement('table', { className: 'table table-hover table-bordered' },
                        React.createElement('thead', null,
                            React.createElement('tr', { style: { verticalAlign: 'middle' } }, 
                            values[instanceid].diskuserperprocess[0]?.map((header, index) => 
                                    React.createElement('th', {
                                        key: index
                                    }, header),
                                )
                            )
                        ),
                        React.createElement('tbody', null,
                            values[instanceid].diskuserperprocess.slice(1).map((row, rowIndex) => 
                                React.createElement('tr', { key: rowIndex },
                                    row.map((cell, cellIndex) => React.createElement('td', { key: cellIndex }, cell))
                                )
                            )
                        )
                    )
                ),   
            )
        )
    );
}

const startmonitorssm = (instanceid) => {
    if (!document.getElementById('ssmmonitor-' + instanceid)){
        let div = document.createElement("div");
        div.id = 'ssmmonitor-' + instanceid;
        div.classList.add('container-fluid', 'ssmmonitor-data');
        document.getElementById("monitoreddata").appendChild(div);

        ReactDOM.render(React.createElement(monitorssm ,{instanceid: instanceid, region: warehouse['Instances'][instanceid]['Region']}), document.getElementById('ssmmonitor-' + instanceid));
    }
}

const stopmonitorssm = (instanceid) => {
    if (document.getElementById('ssmmonitor-' + instanceid)){
        ReactDOM.unmountComponentAtNode(document.getElementById('ssmmonitor-' + instanceid));
        document.getElementById('ssmmonitor-' + instanceid).remove();
    }
}

document.addEventListener("DOMContentLoaded", function() {
    document.body.addEventListener("click", function(e) {
        let row = e.target.closest('.parent-row');
        if (row) {
            const groupName = row.getAttribute('data-rowgroup');
            const childRows = document.querySelectorAll(`.child-row[data-rowgroup="${groupName}"]`);
            const subchildRows = document.querySelectorAll(`.subchild-row[data-uniqueid^="${groupName}-"]`);

            childRows.forEach(child => {
                child.style.display = (child.style.display === "none" || child.style.display === "") ? "table-row" : "none";
            });

            subchildRows.forEach(subchild => {
                subchild.style.display = "none";
            });
        }
        row = e.target.closest('.child-row');
        if (row) {
            const parentGroup = row.getAttribute('data-rowgroup');
            const parentUserContent = row.querySelector('td').textContent;
            const uniqueId = `${parentGroup}-${parentUserContent}`;
            const subchildRows = document.querySelectorAll(`.subchild-row[data-uniqueid="${uniqueId}"]`);
            subchildRows.forEach(subchild => {
                subchild.style.display = (subchild.style.display === "none" || subchild.style.display === "") ? "table-row" : "none";
            });            
        }

    });
});

document.addEventListener('DOMContentLoaded', function() {
    var showHistoryBtn = document.getElementById('showHistoryBtn');
    var showMonitorBtn = document.getElementById('showMonitorBtn');
    var historyContainer = document.getElementById('history');
    var monitorContainer = document.getElementById('monitor');
    var overlay = document.getElementById('overlay');

    showHistoryBtn.addEventListener('click', function() {
        historyContainer.className = historyContainer.className.includes('d-none') ? 'container-fluid' : 'container-fluid d-none';
        overlay.className = overlay.className.includes('d-none') ? '' : 'd-none';
    });

    showMonitorBtn.addEventListener('click', function() {
        monitorContainer.className = monitorContainer.className.includes('d-none') ? 'container-fluid' : 'container-fluid d-none';
        overlay.className = overlay.className.includes('d-none') ? '' : 'd-none';
    });

});