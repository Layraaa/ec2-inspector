/* EC2 VISOR */

/* Add listener to elements */
const addListener = (element, id) => {
    const clickHandler = function() {
        showdata(id);
    };

    if (element.dataset.hasListener) {
        element.removeEventListener('click', element.clickHandler);
    }

    element.addEventListener('click', clickHandler);
    element.dataset.hasListener = true;
    element.clickHandler = clickHandler;
}

/* Draggable bar */
var informationpanel = document.querySelector("#informationpanel");
var additionaldetailspanel = document.querySelector("#additionaldetailspanel");
var draggable = document.querySelector("#draggable");

var dragging = false;
var lastClientY;

draggable.addEventListener("mousedown", function() {
    dragging = true;
    document.body.style.userSelect = "none"; // Disable text selection
});

draggable.addEventListener("touchstart", function() {
    dragging = true;
    document.body.style.userSelect = "none"; // Disable text selection
});

window.addEventListener("mouseup", function() {
    dragging = false;
    document.body.style.userSelect = ""; // Enable text selection
});

window.addEventListener("touchend", function() {
    dragging = false;
    document.body.style.userSelect = ""; // Enable text selection
});

window.addEventListener("mousemove", function(e) {
    handleDrag(e.clientY);
});

window.addEventListener("touchmove", function(e) {
    handleDrag(e.touches[0].clientY);
});

const handleDrag = (clientY) => {
    if (dragging) {
        lastClientY = clientY;
    }
}

const updateUI = () => {
    if (!dragging || lastClientY === undefined) {
        requestAnimationFrame(updateUI);
        return;
    }
    
    var principalHeight = window.innerHeight;
    var dragHeight = draggable.offsetHeight;
    var minHeight = 50; // Minimum height of each containers

    var cursorPosition = lastClientY;
    var informationpanelHeight = cursorPosition - dragHeight / 2;  
    var additionaldetailspanelHeight = principalHeight - cursorPosition - dragHeight / 2;

    if (informationpanelHeight > minHeight && additionaldetailspanelHeight > minHeight) {
        informationpanel.style.height = informationpanelHeight + "px";
        additionaldetailspanel.style.height = additionaldetailspanelHeight + "px";
    }

    // Clear lastClientY
    lastClientY = undefined;

    // Call updateUI again on the next frame
    requestAnimationFrame(updateUI);
}

// Kick off the loop
requestAnimationFrame(updateUI);

/* Show and hide Instances IDs/Instances IPs */
const showandhideipsandids = () => {
    const ipinstances = document.querySelectorAll(".ipinstance");

    if (ipinstances.length === 0){
        return null;
    }

    if (window.getComputedStyle(ipinstances[0]).display === "block") {
        document.querySelectorAll(".idinstance").forEach(function(el) {
            el.style.display = "block";
        });
        ipinstances.forEach(function(el) {
            el.style.display = "none";
        });
        document.getElementById('showandhideipsandids').innerHTML = "Show instances by IPs";

    } else {
        document.querySelectorAll(".idinstance").forEach(function(el) {
            el.style.display = "none";
        });
        ipinstances.forEach(function(el) {
            el.style.display = "block";
        });
        document.getElementById('showandhideipsandids').innerHTML = "Show instances by IDs";
    }
}

const exportdata = (caseName, firstName, lastName) => {

    const clientdata = {
        'caseName' : caseName,
        'firstName' : firstName,
        'lastName' : lastName,
        'Client start time' : exportwarehouse['Client start time'],
        'Client export time' : getactualdatetime(),
        'Client timezone' : (new Date().getTimezoneOffset() / 60) * -1,
        'Client region' : Intl.DateTimeFormat().resolvedOptions().timeZone,
        'Server start time' : exportwarehouse['Server start time'],
    }
    
    $.ajax({
        url: '/export_data',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ clientdata: clientdata }),
        success: function(reply){
            var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(reply));
            var download = document.createElement('a');

            var today = new Date();
            var datetime = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate() + ' ' + today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
            
            download.setAttribute("href", dataStr);
            download.setAttribute("download", "data-" + datetime + ".json");
            document.body.appendChild(download);
            download.click();
            download.remove();
        }
    })
}

const exportwarehouse = {
    'Server start time': document.querySelector('meta[name="starttime"]').getAttribute("content"),
    'Client start time': getactualdatetime()
}

let warehouse = {
    'Instances' : {},
    'Images' : {},
    'Network interfaces' : {},
    'Security groups' : {},
    'Subnets' : {},
    'Vpcs' : {},
    'Volumes' : {}
};

/* Update VPCs select */
const updateVpcs = (region) => {
    document.getElementById('loader').style.display = "inline-block";
    if (region !== "all"){
        $.ajax({
            url: '/get_vpcs',
            type: 'GET',
            data: { region: region },
            success: function(response) {
                document.getElementById('barvpcs').disabled = false;
                const select = document.getElementById('barvpcs');
                const vpcs = response;

                select.innerHTML = "";
                
                const defaultcontainer = document.createElement("option");
                defaultcontainer.text = "Vpc";
                defaultcontainer.value = "";
                defaultcontainer.disabled = true;
                defaultcontainer.selected = true;
                select.appendChild(defaultcontainer);
                
                const alloption = document.createElement("option");
                alloption.text = "All";
                alloption.value = "all";
                select.appendChild(alloption);

                for (var i = 0; i < vpcs.length; i++) {
                    const optionvpc = document.createElement("option");
                    optionvpc.text = vpcs[i];
                    optionvpc.value = vpcs[i];
                    select.appendChild(optionvpc);
                }

                document.getElementById('loader').style.display = "none";
            }
        });
    } else {
        document.getElementById('barvpcs').disabled = false;
        document.getElementById('barvpcs').value = "all";
        document.getElementById('barsubnets').disabled = false;
        document.getElementById('barsubnets').value = "all";
        document.getElementById('barinstances').disabled = false;
        document.getElementById('barinstances').value = "all";
        document.getElementById('loader').style.display = "none";
    }
}

/* Update Subnets select */
const updateSubnets = (vpc) => {
    document.getElementById('loader').style.display = "inline-block";
    if (vpc !== "all"){
        const region = document.getElementById('barregions').value;
        $.ajax({
            url: '/get_subnets',
            type: 'GET',
            data: { vpc: vpc, region: region },
            success: function(response) {
                document.getElementById('barsubnets').disabled = false;
                const select = document.getElementById('barsubnets');
                const subnets = response;

                select.innerHTML = "";
                
                const defaultcontainer = document.createElement("option");
                defaultcontainer.text = "Subnet";
                defaultcontainer.value = "";
                defaultcontainer.disabled = true;
                defaultcontainer.selected = true;
                select.appendChild(defaultcontainer);

                const alloption = document.createElement("option");
                alloption.text = "All";
                alloption.value = "all";
                select.appendChild(alloption);

                for (var i = 0; i < subnets.length; i++) {
                    const optionsubnet = document.createElement("option");
                    optionsubnet.text = subnets[i].id;
                    optionsubnet.value = subnets[i].id;
                    select.appendChild(optionsubnet);
                }

                document.getElementById('loader').style.display = "none";
            }
        });
    } else {
        document.getElementById('barsubnets').disabled = false;
        document.getElementById('barsubnets').value = "all";
        document.getElementById('barinstances').disabled = false;
        document.getElementById('barinstances').value = "all";
        document.getElementById('loader').style.display = "none";
    }
}

/* Update Instances select */
const updateInstances = (subnet) => {
    document.getElementById('loader').style.display = "inline-block";
    if (subnet !== "all"){
        const region = document.getElementById('barregions').value;
        $.ajax({
            url: '/get_instances',
            type: 'GET',
            data: { subnet: subnet, region: region },
            success: function(response) {
                document.getElementById('barinstances').disabled = false;
                const select = document.getElementById('barinstances');
                const instances = response;

                select.innerHTML = "";
                
                const defaultcontainer = document.createElement("option");
                defaultcontainer.text = "Instance";
                defaultcontainer.value = "";
                defaultcontainer.disabled = true;
                defaultcontainer.selected = true;
                select.appendChild(defaultcontainer);

                const alloption = document.createElement("option");
                alloption.text = "All";
                alloption.value = "all";
                select.appendChild(alloption);

                for (var i = 0; i < instances.length; i++) {
                    const optioninstance = document.createElement("option");
                    optioninstance.text = instances[i].id;
                    optioninstance.value = instances[i].id;
                    select.appendChild(optioninstance);
                }

                document.getElementById('loader').style.display = "none";
            }
        });
    } else {
        document.getElementById('barinstances').disabled = false;
        document.getElementById('barinstances').value = "all";
        document.getElementById('loader').style.display = "none";
    }
}

/* GET DATA FUNCTION */
const getdata = (query, id, region) => {
    document.getElementById('loader').style.display = "inline-block";
    $.ajax({
        url: '/get_data',
        type: 'GET',
        data: { query: query, id: id, region: region },
        success: function([id, data, metadata]) {
            if (Object.keys(id).length > 0) {
                for (const [key, value] of Object.entries(id)) {
                    // Check if id has any value
                    if (value.length !== 0){
                        
                        // Iterate all loop
                        for (let i = 0; i < value.length; i++) {
                            
                            // Check if id is an instance or aditional data, and show data in HTML
                            if (value[i].startsWith("i-") === true){

                                // Add data to object
                                if (!warehouse['Instances'][value[i]]) {
                                    warehouse['Instances'][value[i]] = {};
                                }
                                Object.assign(warehouse['Instances'][value[i]], data[key][i]);

                                // Creating the 'instances' container if it does not exist
                                if (!document.getElementById("instances")) {
                                    let instancesContainer = document.createElement("details");
                                    instancesContainer.id = "instances";
                                    
                                    let summaryElement = document.createElement('summary');
                                    summaryElement.innerText = "Regions";
                                    instancesContainer.appendChild(summaryElement);
                                
                                    document.getElementById("all-instances").appendChild(instancesContainer);
                                }

                                // If instances are shutting down or terminated (no VpcId value and no SubnetId value)
                                if (data[key][i]['State'] == "terminated" || data[key][i]['State'] == "shutting-down"){

                                    if (document.getElementById(value[i])){
                                        let instancestate = document.createElement("span");
                                        instancestate.classList.add(data[key][i]["State"]);
                                        instancestate.innerText = data[key][i]["State"];

                                        let idcontainer = document.getElementById(value[i]);

                                        idcontainer.removeChild(idcontainer.lastElementChild);
                                        
                                        document.getElementById(value[i]).appendChild(instancestate)
                                        document.getElementById("terminatedinstances").appendChild(document.getElementById(value[i]));

                                    } else {
                                        let instance = document.createElement("div");
                                        let idinstance = document.createElement("div");
                                        let instancestate = document.createElement("span");

                                        instance.id = value[i];
                                        instance.classList.add("instance");
                                        idinstance.classList.add("idinstancedead");
                                        addListener(idinstance, value[i]);
                                        instancestate.classList.add(data[key][i]["State"]);

                                        idinstance.innerText = value[i];
                                        instancestate.innerText = data[key][i]["State"];

                                        instance.appendChild(idinstance);
                                        instance.appendChild(instancestate);

                                        document.getElementById("terminatedinstances").appendChild(instance);
                                    }

                                    warehouse['Instances'][value[i]]['SSM Enabled'] = "-";

                                    continue;
                                }
                                
                                let region = getOrCreateElement("instances", data[key][i]["Region"]);
                                let vpc = getOrCreateElement(data[key][i]["Region"], data[key][i]["VpcId"]);
                                let subnet = getOrCreateElement(data[key][i]["VpcId"], data[key][i]["SubnetId"]);
                            
                                let instance = createInstanceElement(data[key][i]["InstanceId"], data[key][i]["State"], data[key][i]['PrivateIpAddress']);
                            
                                subnet.appendChild(instance);

                                /* SSM */

                                $.ajax({
                                    url: '/get_data_ssm_check_permises',
                                    type: 'GET',
                                    success: function(response) {
                                        if (response === "True"){
                                            testec2query(value[i], data[key][i]["Region"]);
                                        }
                                    },
                                    error: function(jqXHR) {
                                        if (jqXHR.status === 400) {
                                            console.error('No permises');
                                        }
                                    }
                                });
                                
                            } else {

                                document.getElementById("additionaldetailstext").innerHTML = "Details of " + value[i];
                                containerFluid.innerHTML = "";

                                switch (true){

                                    case value[i].startsWith("ami-"):
                                        if (!warehouse['Images'][value[i]]) {
                                            warehouse['Images'][value[i]] = {};
                                        }
                                        Object.assign(warehouse['Images'][value[i]], data[key][i]);

                                        createimagesblock(data[key][i]);
                                        break;

                                    case value[i].startsWith("vol-"):
                                        if (!warehouse['Volumes'][value[i]]) {
                                            warehouse['Volumes'][value[i]] = {};
                                        }
                                        Object.assign(warehouse['Volumes'][value[i]], data[key][i]);

                                        volumesblock(data[key][i]);
                                        break;

                                    case value[i].startsWith("sg-"):
                                        if (!warehouse['Security groups'][value[i]]) {
                                            warehouse['Security groups'][value[i]] = {};
                                        }
                                        Object.assign(warehouse['Security groups'][value[i]], data[key][i]);

                                        createsecuritygroupsblock(data[key][i], value[i])
                                        break;

                                    case value[i].startsWith("eni-"):
                                        if (!warehouse['Network interfaces'][value[i]]) {
                                            warehouse['Network interfaces'][value[i]] = {};
                                        }
                                        Object.assign(warehouse['Network interfaces'][value[i]], data[key][i]);

                                        createinterfaceblock(data[key][i]);
                                        break;

                                    case value[i].startsWith("subnet-"):
                                        if (!warehouse['Subnets'][value[i]]) {
                                            warehouse['Subnets'][value[i]] = {};
                                        }
                                        Object.assign(warehouse['Subnets'][value[i]], data[key][i]);

                                        subnetblock(data[key][i]);
                                        break;

                                    case value[i].startsWith("vpc-"):
                                        if (!warehouse['Vpcs'][value[i]]) {
                                            warehouse['Vpcs'][value[i]] = {};
                                        }
                                        Object.assign(warehouse['Vpcs'][value[i]], data[key][i]);

                                        vpcblock(data[key][i]);
                                        break;
                                }
                            }
                        }

                        showinfoalert(metadata, key);

                    } else {
                        showdangeralert('No instances was found in ' + key);
                    }
                }
            } else {
                showdangeralert('No instances was found in ' + region);
            }

            document.getElementById('loader').style.display = "none";
        }
    });
}
/* getdata() functions dependences */

const getOrCreateElement = (parentId, id) => {
    let detailsElement = document.getElementById(id);
    
    if (!detailsElement) {
        let summaryElement = document.createElement('summary');
        summaryElement.innerText = id;
        
        detailsElement = document.createElement('details');
        detailsElement.id = id;

        detailsElement.appendChild(summaryElement);
        document.getElementById(parentId).appendChild(detailsElement);
    }

    return detailsElement;
}

const createInstanceElement = (id, state, privateIpAddress) => {
    let instance = document.getElementById(id);

    if (!instance) {
        instance = document.createElement("div");
        instance.id = id;
        instance.classList.add("instance");

        let idinstance = document.createElement("div");
        idinstance.classList.add("idinstance");
        addListener(idinstance, id);
        idinstance.innerText = id;

        let ipInstance = document.createElement("div");
        ipInstance.classList.add("ipinstance");
        addListener(ipInstance, id);
        ipInstance.innerText = privateIpAddress;

        let instancestate = document.createElement("span");
        instancestate.classList.add(state);
        instancestate.innerText = state;

        instance.appendChild(idinstance);
        instance.appendChild(ipInstance);
        instance.appendChild(instancestate);

    } else {

        instance.removeChild(instance.lastElementChild);

        let instancestate = document.createElement("span");
        instancestate.classList.add(state);
        instancestate.innerText = state;

        instance.appendChild(instancestate);
    }

    return instance;
}

/* Test EC2 Query */

const testec2query = (instance, region) => {
    $.ajax({
        url: '/get_data_ssm_testec2',
        type: 'GET',
        data: { instanceid: instance, region: region },
        success: function(response) {
            response = response.trim();
            if (response == "SSM is working!"){

                warehouse['Instances'][instance]['SSM Enabled'] = "Yes";

                if (!document.getElementById("ssm-" + instance)){
                    
                    // Main container
                    let div = document.createElement("div");
                    div.id = "ssm-" + instance;
                    div.classList.add("d-flex", "align-items-center");

                    // Instance ID
                    let instancedata = document.createElement("div");
                    instancedata.innerHTML = instance;

                    // Buttons
                    let query = document.createElement("button");
                    query.classList.add("btn", "btn-primary", "d-flex", "divider");
                    query.setAttribute("title", "Query");
                    let gearicon = document.createElement("img");
                    gearicon.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAbwAAAG8B8aLcQwAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAADqSURBVDiNpZMhDsJAEEXfloRzICtIOAaOM+wRkHgEaQWCG3CBChIcoqISUYNBcYqaikUwW6bLQko6ySQznb9/5+9Mcc4Rc8ACTtx+wyWIGWMmxpgFb1uFsXmZxuBvS4Cj3HYGdkCjOmiADKgk33adCsFSgYf6XBNMgXsAaIFavA1qFWA6AiE5KMANSFUtlW++nqkaFiiU5lYfDkh8J42csUS01T9GW4f4boxjbJwEBcj/eMR9bw8EVDJ8jFcg0Xswizzm8EUSkrUUSpETrnIOXCTffEjwnai4UARFDNP7GwGccw+VnmJxgOEJkYQ6FkjQFFkAAAAASUVORK5CYII=';
                    query.appendChild(gearicon);

                    query.addEventListener('click', function(){queryssm(instance)});

                    let show = document.createElement("button");
                    show.classList.add("btn", "btn-secondary", "d-flex");
                    show.setAttribute("title", "Show data");
                    let eyeicon = document.createElement("img");
                    eyeicon.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAewAAAHsBR0tLmwAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAADMSURBVDiNxdMxSgNhEAXg79eQIibsDazTeAYb+7SCWHiiHCFgsZ13SJEjWMRKcoS0KRybWfgX2bVYwYHXvHkzMG9mSkSYEleTqn9rUEppSinNaIeI6AFr7HDEV+KY3PqHvipcYIsLAi1eEm1yl9Qseg2wxD5FgUfM8ZSYJ9fl91h2C1jhUCXbLHjHa3Kn5NpKd8DqGm94qGzZpg83+MQ9Gnxko03qbnE3G/H3eSTXi6ERThU3OMJ0E/9kjVMOqYw9U3fGEXEe1Pz7N34DNTeiT/TfYjIAAAAASUVORK5CYII=';
                    show.appendChild(eyeicon);

                    show.addEventListener('click', function(){showssm(instance)});

                    let startmonitor = document.createElement("button");
                    startmonitor.classList.add("btn", "btn-success", "d-flex");
                    startmonitor.setAttribute("title", "Start monitor");
                    let playicon = document.createElement("img");
                    playicon.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAB2AAAAdgFOeyYIAAAAGXRFWHRTb2Z0d2FyZQB3d3cuaW5rc2NhcGUub3Jnm+48GgAAAJRJREFUOI3F0j0KwmAQhOFHjeBpLC0EsbG3srey8QoezcbKxi5gK4J3sIkkRfJBlGD+igwMLCz7srsMQ2tSqqc4YY4YSVvYBmnhFw6I2gC2JUDwowCNuwKCY+z6AIIvWPYBpPhgFYYa3fajBO+ugDMWuFU1/51wxbqOXgW4y78/arJeOUhP7H0ntVaRPMpHzNoMDqsMpoM7y5Ngq9IAAAAASUVORK5CYII=';
                    startmonitor.appendChild(playicon);

                    startmonitor.addEventListener('click', function(){startmonitorssm(instance)});

                    let stopmonitor = document.createElement("button");
                    stopmonitor.classList.add("btn", "btn-danger", "d-flex" );
                    stopmonitor.setAttribute("title", "Stop monitor");
                    let stopicon = document.createElement("img");
                    stopicon.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAB2AAAAdgFOeyYIAAAAGXRFWHRTb2Z0d2FyZQB3d3cuaW5rc2NhcGUub3Jnm+48GgAAAFNJREFUOI3t0yESgCAABdEn1cr9u0jWg4lZgwTHhFL9Mxt324eIjIKjkYK5uvIL8Ukaam30bWWopc8LPfIf+AP3wN7hl4C1I7BwXTJh0/7CDRPiCTVAMF2842/MAAAAAElFTkSuQmCC';
                    stopmonitor.appendChild(stopicon);

                    stopmonitor.addEventListener('click', function(){stopmonitorssm(instance)});
                    

                    div.appendChild(instancedata);
                    div.appendChild(query);
                    div.appendChild(show);
                    div.appendChild(startmonitor);
                    div.appendChild(stopmonitor);

                    document.getElementById("ssm-instances").appendChild(div);

                }

                $.ajax({
                    url: '/get_data_ssm_install_dependences',
                    type: 'HEAD',
                    data: { instanceid: instance, region: region }
                });   

            } else if (response == "Instance ID is not valid") {
                warehouse['Instances'][instance]['SSM Enabled'] = "No";
            } else {
                warehouse['Instances'][instance]['SSM Enabled'] = "Uknown error";
            }

        },
        error: function(){
            warehouse['Instances'][instance]['SSM Enabled'] = "-";
        }
    });
}




/* Create additional data containers */

// Function to create a div element with a specific class
const createDiv = (className) => {
    const div = document.createElement('div');
    div.classList.add(className);
    return div;
}

// Function to create a row with an h3 header and multiple columns
const createRow = (title, cols, data) => {
    const row = createDiv('row');
    row.classList.add("my-3")
    const h3 = document.createElement('h3');
    h3.classList.add('col-12');
    h3.textContent = title;
    row.appendChild(h3);

    cols.forEach(col => {
        const key = col.replace(/[\s:]/g, '');
        const div = createDiv('col-4');
        const value = (data[key] === undefined || data[key] === null || data[key] === '') ? '-' : data[key];
        div.textContent = col + value;
        row.appendChild(div);
    });

    containerFluid.appendChild(row);
}

// Function to create a table with titles, data and add it to a specific div
const createTable = (title, headers, data) => {

    if (data === undefined){
        return;
    }

    let div = createDiv("row");
    div.classList.add("my-3")

    // Create the table title
    let h3 = document.createElement('h3');
    h3.classList.add('col-12');
    h3.textContent = title;
    div.appendChild(h3);

    // Create table
    let divtable = createDiv("col-12")
    div.appendChild(divtable)

    let table = document.createElement('table');
    table.classList.add('table', 'table-hover');

    // Create table header
    let thead = document.createElement('thead');
    let tr = document.createElement('tr');
    headers.forEach(header => {
        let th = document.createElement('th');
        th.textContent = header;
        tr.appendChild(th);
    });
    thead.appendChild(tr);
    table.appendChild(thead);

    // Create table body
    let tbody = document.createElement('tbody');
    tbody.classList.add('table-group-divider');
    data.forEach(item => {
        let tr = document.createElement('tr');
        item.forEach(tdValue => {
            let td = document.createElement('td');
            td.textContent = tdValue;
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    divtable.appendChild(table);
    containerFluid.appendChild(div);
}

const transformTagsData = (tagsData) => {
    if (Object.keys(tagsData).length === 0){
        return;
    } else {
        return tagsData.map(tag => [tag.Key, tag.Value]);
    }
    
}

const transformTagsDataForText = (tagsData) => {
    if (Object.keys(tagsData).length === 0){
        return;
    } else {
        return tagsData.map(tag => `${tag.Key}: ${tag.Value}`);
    }
}

const transformGroupData = (groupData) => {
    if (Object.keys(groupData).length === 0){
        return;
    } else {
        return groupData.map(group => [group.GroupId, group.GroupName]);
    }
}

const transformRuleData = (ruleData) => {
    if (ruleData.length === 0){
        return;
    } else {
        return ruleData.map(rule => {
            let nameTag = rule.Tags.find(tag => tag.Key === 'Name');

            let name = nameTag ? nameTag.Value : '-';

            let ports = rule.FromPort == -1 && rule.ToPort == -1 
                ? "All" 
                : rule.FromPort == rule.ToPort 
                    ? rule.FromPort 
                    : rule.FromPort + "-" + rule.ToPort;

            let IpProtocol = rule.IpProtocol == -1 ? "All" : rule.IpProtocol;
            let ipType = rule.CidrIpv4 ? 'IPv4' : 'IPv6';
            let ipValue = rule.CidrIpv4 || rule.CidrIpv6;

            return [
                name,
                rule.Description || "-",
                rule.SecurityGroupRuleId,
                ports,
                ipType,
                IpProtocol,
                ipValue,
                transformTagsDataForText(rule.Tags)
            ];
        });
    }
}

const transformCidrData = (cidrData) => {
    if (cidrData.length === 0){
        return;
    } else {
        return cidrData.map(cidr => {
            return [
                cidr.CidrBlock,
                cidr.AssociationId,
                
                cidr.CidrBlockState.State,
                cidr.CidrBlockState.StatusMessage || "-"
            ];
        });
    }
}

const transformIpv6CidrData = (cidrData) => {
    if (cidrData.length === 0){
        return;
    } else {
        return cidrData.map(cidr => {
            return [
                cidr.Ipv6CidrBlock,
                cidr.AssociationId,
                cidr.Ipv6CidrBlockState.State,
                cidr.Ipv6CidrBlockState.StatusMessage || "-",
                cidr.Ipv6Pool,
                cidr.NetworkBorderGroup
            ];
        });
    }
}

const transformIpv6CidrDataSubnetBlock = (cidrData) => {
    if (cidrData.length === 0){
        return;
    } else {
        return cidrData.map(cidr => {
            return [
                cidr.Ipv6CidrBlock,
                cidr.AssociationId,
                cidr.Ipv6CidrBlockState.State,
                cidr.Ipv6CidrBlockState.StatusMessage || "-",
            ];
        });
    }
}

const transformAttachmentsData = (attachmentsData) => {
    if (attachmentsData.length === 0){
        return;
    } else {
        return attachmentsData.map(attach => {
            return [
                attach.AttachTime,
                attach.Device,
                attach.DeleteOnTermination,
                attach.InstanceId,
                attach.State
            ];
        });
    }
}

const createSection = (headerText, deviceData) => {
    const createDetails = (device) => {
        const details = document.createElement('details');
        details.classList.add("col-4");

        const summaryTag = document.createElement('summary');
        summaryTag.textContent = device.DeviceName;
        details.appendChild(summaryTag);

        const cols = [
            'Device Name: ' + device.DeviceName,
            'Virtual Name: ' + (device.VirtualName !== null && device.VirtualName !== undefined ? device.VirtualName : '-'),
            'Size: ' + ((device.Ebs?.VolumeSize !== null && device.Ebs?.VolumeSize !== undefined) ? device.Ebs?.VolumeSize : '-'),
            'Iops: ' + ((device.Ebs?.Iops !== null && device.Ebs?.Iops !== undefined) ? device.Ebs?.Iops : '-'),
            'Volume type: ' + (device.Ebs?.VolumeType !== null && device.Ebs?.VolumeType !== undefined ? device.Ebs?.VolumeType : '-'),
            'Delete on Termination: ' + ((device.Ebs?.DeleteOnTermination !== null && device.Ebs?.DeleteOnTermination !== undefined) ? device.Ebs?.DeleteOnTermination : '-'),
            'Throughput: ' + ((device.Ebs?.Throughput !== null && device.Ebs?.Throughput !== undefined) ? device.Ebs?.Throughput : '-'),
            'Encrypted: ' + ((device.Ebs?.Encrypted !== null && device.Ebs?.Encrypted !== undefined) ? device.Ebs?.Encrypted : '-'),
            'Snaphost Id: ' + (device.Ebs?.SnapshotId !== null && device.Ebs?.SnapshotId !== undefined ? device.Ebs?.SnapshotId : '-'),
            'Kms Key Id: ' + (device.Ebs?.KmsKeyId !== null && device.Ebs?.KmsKeyId !== undefined ? device.Ebs?.KmsKeyId : '-'),
            'Output Arn: ' + (device.Ebs?.OutpostArn !== null && device.Ebs?.OutpostArn !== undefined ? device.Ebs?.OutpostArn : '-'),
            'No device: ' + ((device.NoDevice !== null && device.NoDevice !== undefined) ? device.NoDevice : '-')
        ];
        
        details.appendChild(createRowDetails(cols));

        return details;
    }

    const createRowDetails = (cols) => {
        const row = document.createElement('div');
        row.classList.add('row');
        cols.forEach(col => {
            const div = document.createElement('div');
            div.textContent = col;
            row.appendChild(div);
        });
        return row;
    }

    const row = createDiv('row');
    row.classList.add("my-3");

    const header = document.createElement('h3');
    header.textContent = headerText;
    row.appendChild(header);

    deviceData.forEach(device => {
        const col = document.createElement('div');
        col.classList.add('row');
        col.appendChild(createDetails(device));
        row.appendChild(col);
    });

    containerFluid.appendChild(row);

    return row;
}

const containerFluid = document.getElementById("containeradditionaldetailspanel");

const createimagesblock = (data) => {
    // Images Block
    createRow('General', ['Name: ', 'Description: ', 'State: ', 'State Reason: ', 'Image Type: ', 'Image Location: ','Image Owner Alias: ', 'Architecture: ', 'Owner Id: ', 'Platform Details: ', 'Sriov Net Support: ','Public: ', 'Creation Date: ', 'Deprecation Time: ', 'Root Device Name: ', 'Root Device Type: ','Kernel Id: ', 'Ramdisk Id: '], data);
    createRow('Virtualization', ['Hypervisor: ', 'Virtualization Type: ', 'Boot Mode: ', 'Ena Support: ', 'Tpm Support: ', 'Imds Support: '], data);
    createSection('Devices', data['BlockDeviceMappings']);
    createTable('Tags', ['Key', 'Value'], transformTagsData(data['Tags']));
    containerFluid.appendChild(document.createElement('hr'));
}

const createinterfaceblock = (data) => {
    // Interface Block
    createRow('General', [ 'Interface Type: ', 'Status: ', 'Availability Zone: ', 'Vpc Id: ' , 'Subnet Id: ' , 'Owner Id: ', 'Ipv6 Native: ', 'Deny All Igw Traffic: ', 'Requester Id: ', 'Requester Managed: '], data);
    createRow('Association', ['Allocation Id: ', 'Association Id: ','Ip Owner Id: ','Public Dns Name: ','Public Ip: ','Customer Owned Ip: ','Carrier Ip: '], data['Association']);
    createRow('Attachment', ['Attach Time: ', 'Attachment Id: ', 'Status: ', 'Delete On Termination: ', 'Device Index: ','Network Card Index: ', 'Instance Id: ', 'Instance Owner Id: ', 'Ena Srd Enabled: ', 'Ena Srd Udp Enabled: '], data['Attachment']);
    createRow('Networking', ['Mac Address: ', 'Private Ip Address: ', 'Private Dns Name: '], data);
    createTable('Security Groups:', ['Group Name', 'Group Id'], transformGroupData(data['Groups']));
    createTable('Tags:', ['Key', 'Value'], transformTagsData(data['Tags']));
    containerFluid.appendChild(document.createElement('hr'));
}

const createsecuritygroupsblock = (data, id) => {
    // Security Groups Block
    const rules = data['SecurityGroupRules'];

    const { ingressRules, egressRules } = rules.reduce((acc, rule) => {
        if (rule.IsEgress) {
            acc.egressRules.push(rule);
        } else {
            acc.ingressRules.push(rule);
        }
        return acc;
    }, { ingressRules: [], egressRules: [] });

    data['NumberofInboudRules'] = ingressRules.length;
    data['NumberofOutboundRules'] = egressRules.length;
    warehouse['Security groups'][id]['NumberofInboudRules'] = ingressRules.length;
    warehouse['Security groups'][id]['NumberofOutboundRules'] = egressRules.length;


    createRow('General', ['Group Name: ', 'Description: ', 'Vpc Id: ', 'Number of Inboud Rules: ', 'Number of Outbound Rules: ', 'Owner Id: '], data);
    createTable('Inbound rules:', ['Name', 'Description', 'Rule Id', 'Ports', 'IP Version', 'IP protocol', 'Cidr IP', 'Tags'], transformRuleData(ingressRules));
    createTable('Outbound rules:', ['Name', 'Description', 'Rule Id', 'Ports', 'IP Version', 'IP protocol', 'Cidr IP', 'Tags'], transformRuleData(egressRules));
    createTable('Tags', ['Key', 'Value'], transformTagsData(data['Tags']));
    containerFluid.appendChild(document.createElement('hr'));
}

const subnetblock = (data) => {
    // Subnet Block
    createRow('General', ['Availability Zone: ', 'Availability Zone Id: ', 'State: ', 'Available Ip Address Count: ', 'Default For Az: ', 'Cidr Block: ', 'Vpc Id: ', 'Owner Id: ', 'Map Customer Owned Ip On Launch: ', 'Customer Owned Ipv4 Pool: ', 'Enable Lni At Device Index: ', 'Map Public Ip On Launch: ', 'Subnet Arn: '], data);
    createRow('Networking', ['AssignIpv6AddressOnCreation: ', 'Ipv6Native: ', 'EnableDns64: ', 'Hostname Type: ', 'Enable Resource Name Dns A Record: ', 'Enable Resource Name Dns AAAA Record: '], data);
    createTable('Ipv6', ['Ipv6 Cidr Block', 'Association Id', 'State', 'Status Message'], transformIpv6CidrDataSubnetBlock(data["Ipv6CidrBlockAssociationSet"]));
    createTable('Tags', ['Key', 'Value'], transformTagsData(data['Tags']));
    containerFluid.appendChild(document.createElement('hr'));
}

const vpcblock = (data) => {
    // VPC Block
    createRow('General', ['Is Default: ', 'State: ', 'Cidr Block: ', 'Dhcp Options Id: ', 'Owner Id: ', 'Instance Tenancy: '], data);
    createTable('Cidr Block Association Set', ['Block', 'Association Id', 'State', 'Status'], transformCidrData(data['CidrBlockAssociationSet']));
    createTable('Ipv6 Cidr Block Association Set', ['Block', 'Association Id', 'State', 'Status', 'Network Border Group', 'Ipv6 Pool'], transformIpv6CidrData(data['Ipv6CidrBlockAssociationSet']));
    createTable('Tags', ['Key', 'Value'], transformTagsData(data['Tags']));
}

const volumesblock = (data) => {
    // Volumes Block
    createRow('General', ['Size: ', 'Iops: ', 'Create Time: ', 'State: ', 'Encrypted: ', 'Volume Type: ', 'Snapshot Id: ', 'Availability Zone: ', 'Fast Restored: ', 'Multi Attach Enabled: ', 'Kms Key Id: ', 'Output Arn: ', 'Throughput: '], data);
    createTable('Attachment', ['Attach time', 'Device', 'Delete on termination', 'Instance Id', 'State'], transformAttachmentsData(data['Attachments']));
    createTable('Tags', ['Key', 'Value'], transformTagsData(data['Tags']));
    containerFluid.appendChild(document.createElement('hr'));
}

/* GET INSTANCES */
const getdatainstances = () => {
    if (document.getElementById('barregions').value !== "" && document.getElementById('barvpcs').value !== "" && document.getElementById('barsubnets').value !== "" && document.getElementById('barinstances').value !== "" ){
        if (document.getElementById('barinstances').value === "all"){
            if (document.getElementById('barsubnets').value === "all"){
                if (document.getElementById('barvpcs').value === "all"){
                    if (document.getElementById('barregions').value === "all"){
                        // Get all instances
                        query = "ec2-instances-all";
                        getdata(query);
                    } else {
                        // Get all instances from region
                        query = "ec2-instances-region";
                        id = undefined;
                        region = document.getElementById('barregions').value;
                        getdata(query, id, region);
                    }
                } else {
                    // Get all instances from a VPC
                    query = "ec2-instances-vpc"
                    vpc = document.getElementById('barvpcs').value;
                    region = document.getElementById('barregions').value;
                    getdata(query, vpc, region);
                }
            } else {
                // Get all instances from a subnet
                query = "ec2-instances-subnet";
                subnet = document.getElementById('barsubnets').value;
                region = document.getElementById('barregions').value;
                getdata(query, subnet, region);
            }
        } else {
            // Get a instance
            query = "ec2-instances-instance";
            instance = document.getElementById('barinstances').value;
            region = document.getElementById('barregions').value;
            getdata(query, instance, region);
        }
    }
}


/* Recover data from object and show it */
const showdata = (id) => {
    // Check if id is an instance or aditional data
    if (id.startsWith("i-") === true){
        // Show data
        document.getElementById("informationtext").innerHTML = "Information of " + id;

        document.getElementById("idinstance").innerHTML = warehouse['Instances'][id]['InstanceId'];
        document.getElementById("instancetype").innerHTML = warehouse['Instances'][id]['InstanceType'];
        document.getElementById("imageid").innerHTML = warehouse['Instances'][id]['ImageId'];
        addListener(document.getElementById("imageid"), warehouse['Instances'][id]['ImageId']);
        document.getElementById("platformdetails").innerHTML = warehouse['Instances'][id]['PlatformDetails'];
        document.getElementById("region").innerHTML = warehouse['Instances'][id]['Region'];
        document.getElementById("architecture").innerHTML = warehouse['Instances'][id]['Architecture'];
        document.getElementById("state").innerHTML = warehouse['Instances'][id]['State'];
        document.getElementById("statetransitionreason").innerHTML = warehouse['Instances'][id]['StateTransitionReason'];
        document.getElementById("amilaunchindex").innerHTML = warehouse['Instances'][id]['AmiLaunchIndex'];
        document.getElementById("launchtime").innerHTML = warehouse['Instances'][id]['LaunchTime'];
        document.getElementById("placement").innerHTML = warehouse['Instances'][id]['Placement'];
        let securityGroupsElement = document.getElementById("securitygroups");
        let securityGroupsTable = generatesecuritygroupstable(warehouse['Instances'][id]);
        securityGroupsElement.replaceChildren(securityGroupsTable);
        let tagsElement = document.getElementById("tags");
        let tagsTable = generatetagstable(warehouse['Instances'][id]['Tags']);
        tagsElement.replaceChildren(tagsTable);

        document.getElementById("privatednsaddress").innerHTML = warehouse['Instances'][id]['PrivateDnsName'];
        document.getElementById("privateipaddress").innerHTML = warehouse['Instances'][id]['PrivateIpAddress'];
        document.getElementById("vpcid").innerHTML =  warehouse['Instances'][id]['VpcId'];
        addListener(document.getElementById("vpcid"), warehouse['Instances'][id]['VpcId']);
        document.getElementById("publicdnsaddress").innerHTML = warehouse['Instances'][id]['PublicDnsName'];
        document.getElementById("publicipaddress").innerHTML = warehouse['Instances'][id]['PublicIpAddress'];
        document.getElementById("subnetid").innerHTML = warehouse['Instances'][id]['SubnetId'];
        addListener(document.getElementById("subnetid"), warehouse['Instances'][id]['SubnetId']);
        let networkinterfacesElement = document.getElementById("networkinterfaces");
        let networkinterfacesTable = generateinterfacetable(warehouse['Instances'][id]);
        networkinterfacesElement.replaceChildren(networkinterfacesTable);

        document.getElementById("rootdevicename").innerHTML = warehouse['Instances'][id]['RootDeviceName'];
        document.getElementById("rootdevicetype").innerHTML = warehouse['Instances'][id]['RootDeviceType'];
        let blockdevicemappingsElement = document.getElementById("blockdevicemappings");
        let blockdevicemappingsTable = generatevolumetable(warehouse['Instances'][id]);
        blockdevicemappingsElement.replaceChildren(blockdevicemappingsTable);

        document.getElementById("ssmenabled").innerHTML = warehouse['Instances'][id]['SSM Enabled']

        // Update data-region value
        document.getElementById("informationpanel").setAttribute("data-region", warehouse['Instances'][id]['Region']);

    } else {

        // Aditional data
        region = document.getElementById("informationpanel").getAttribute("data-region");

        switch (true) {
            case id.startsWith("ami-"):
                query = "ec2-ami";
                getdata(query, id, region);
                break;
            case id.startsWith("vol-"):
                query = "ec2-volume";
                getdata(query, id, region);
                break;
            case id.startsWith("sg-"):
                query = "ec2-securitygroup";
                getdata(query, id, region);
                break;
            case id.startsWith("eni-"):
                query = "ec2-networkinterface";
                getdata(query, id, region);
                break;
            case id.startsWith("subnet-"):
                query = "ec2-subnet";
                getdata(query, id, region);
                break;
            case id.startsWith("vpc-"):
                query = "ec2-vpc";
                getdata(query, id, region);
                break;
        }

    }
}

/* Create tables functions for show content */
const generatesecuritygroupstable = (inputdata) => {
    let data = inputdata['SecurityGroups'];

    let table = document.createElement('table');
    table.classList.add('table', 'table-hover');

    let thead = document.createElement('thead');
    let theadRow = document.createElement('tr');
    let thName = document.createElement('th');
    thName.innerText = 'Group Name';
    let thID = document.createElement('th');
    thID.innerText = 'Group ID';

    theadRow.appendChild(thName);
    theadRow.appendChild(thID);
    thead.appendChild(theadRow);
    table.appendChild(thead);

    let tbody = document.createElement('tbody');
    tbody.classList.add('table-group-divider');

    for (const [key, value] of Object.entries(data)) {
        let tr = document.createElement('tr');
        let tdKey = document.createElement('td');
        tdKey.innerText = key;
        let tdValue = document.createElement('td');
        tdValue.classList.add("groupid");
        tdValue.innerText = value;
        addListener(tdValue, value);
        

        tr.appendChild(tdKey);
        tr.appendChild(tdValue);
        tbody.appendChild(tr);
    }

    table.appendChild(tbody);
    return table;
}

const generatetagstable = (inputdata) => {
    let data = inputdata;

    let table = document.createElement('table');
    table.classList.add('table', 'table-hover');

    let thead = document.createElement('thead');
    let theadRow = document.createElement('tr');
    let thKey = document.createElement('th');
    thKey.innerText = 'Key';
    let thValue = document.createElement('th');
    thValue.innerText = 'Value';

    theadRow.appendChild(thKey);
    theadRow.appendChild(thValue);
    thead.appendChild(theadRow);
    table.appendChild(thead);

    let tbody = document.createElement('tbody');
    tbody.classList.add('table-group-divider');

    for (let i = 0; i < data.length; i++) {
        let tr = document.createElement('tr');
        let tdKey = document.createElement('td');
        tdKey.innerText = data[i]['Key'];
        let tdValue = document.createElement('td');
        tdValue.innerText = data[i]['Value'];

        tr.appendChild(tdKey);
        tr.appendChild(tdValue);
        tbody.appendChild(tr);
    }

    table.appendChild(tbody);
    return table;
}

const generateinterfacetable = (datainput) => {
    let data = datainput['NetworkInterfaces'];

    let table = document.createElement('table');
    table.classList.add('table', 'table-hover');

    let thead = document.createElement('thead');
    let theadRow = document.createElement('tr');
    let thInterface = document.createElement('th');
    thInterface.innerText = 'Interface';
    let thPrivateIP = document.createElement('th');
    thPrivateIP.innerText = 'Private IP';
    let thPublicIP = document.createElement('th');
    thPublicIP.innerText = 'Public IP';
    let thStatus = document.createElement('th');
    thStatus.innerText = 'Status';

    theadRow.appendChild(thInterface);
    theadRow.appendChild(thPrivateIP);
    theadRow.appendChild(thPublicIP);
    theadRow.appendChild(thStatus);
    thead.appendChild(theadRow);
    table.appendChild(thead);

    let tbody = document.createElement('tbody');
    tbody.classList.add('table-group-divider');

    for (let i = 0; i < data.length; i++) {
        let tr = document.createElement('tr');
        let tdInterface = document.createElement('td');
        tdInterface.innerText = data[i]['NetworkInterfaceId'];
        tdInterface.classList.add("interfaceid");
        addListener(tdInterface, data[i]['NetworkInterfaceId']);
        let tdPrivateIP = document.createElement('td');
        tdPrivateIP.innerText = data[i]['PrivateIpAddress'];
        let tdPublicIP = document.createElement('td');
        tdPublicIP.innerText = tdPublicIP.innerText = data[i]['Association'] && data[i]['Association']['PublicIp'] ? data[i]['Association']['PublicIp'] : "-";
        let tdStatus = document.createElement('td');
        tdStatus.innerText = data[i]['Status'];

        tr.appendChild(tdInterface);
        tr.appendChild(tdPrivateIP);
        tr.appendChild(tdPublicIP);
        tr.appendChild(tdStatus);
        tbody.appendChild(tr);
    }

    table.appendChild(tbody);
    return table;
}

const generatevolumetable = (datainput) => {
    let data = datainput['BlockDeviceMappings'];

    let table = document.createElement('table');
    table.classList.add('table', 'table-hover');

    let thead = document.createElement('thead');
    let theadRow = document.createElement('tr');
    let thVolume = document.createElement('th');
    thVolume.innerText = 'Volume';
    let thStatus = document.createElement('th');
    thStatus.innerText = 'Status';

    theadRow.appendChild(thVolume);
    theadRow.appendChild(thStatus);
    thead.appendChild(theadRow);
    table.appendChild(thead);

    let tbody = document.createElement('tbody');
    tbody.classList.add('table-group-divider');

    for (let i = 0; i < data.length; i++) {
        let tr = document.createElement('tr');
        let tdVolume = document.createElement('td');
        tdVolume.classList.add("volumeid");
        tdVolume.innerText = data[i]['Ebs']['VolumeId'];
        addListener(tdVolume, data[i]['Ebs']['VolumeId']);
        let tdStatus = document.createElement('td');
        tdStatus.innerText = data[i]['Ebs']['Status'];

        tr.appendChild(tdVolume);
        tr.appendChild(tdStatus);
        tbody.appendChild(tr);
    }

    table.appendChild(tbody);
    return table;
}

/* LISTENERS */
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('barregions').addEventListener('change', function() {
        updateVpcs(this.value);
    });

    document.getElementById('barvpcs').addEventListener('change', function() {
        updateSubnets(this.value);
    });

    document.getElementById('barsubnets').addEventListener('change', function() {
        updateInstances(this.value);
    });

    document.getElementById('getdatainstances').addEventListener('click', function() {
        getdatainstances();
    });

    document.getElementById('exportdata').addEventListener('click', function() {
        document.getElementById('containerexportdata').className = document.getElementById('containerexportdata').className.includes('d-none') ? 'container-fluid' : 'container-fluid d-none';
        document.getElementById('overlay').className = document.getElementById('overlay').className.includes('d-none') ? '' : 'd-none';
    });

    document.getElementById('formexportdata').addEventListener('submit', function(event) {
        event.preventDefault();

        const caseName = document.getElementById('caseName').value;
        const firstName = document.getElementById('firstName').value;
        const lastName = document.getElementById('lastName').value;

        exportdata(caseName, firstName, lastName);

        document.getElementById('caseName').value = "";
        document.getElementById('firstName').value = "";
        document.getElementById('lastName').value = "";
    });

    document.getElementById('showandhideipsandids').addEventListener('click', function() {
        showandhideipsandids();
    });
});
