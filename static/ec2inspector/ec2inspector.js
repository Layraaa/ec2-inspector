/* Adapt content height value automatically */
const updateHeights = () => {
    const windowHeight = window.innerHeight;
    var eraseHeight = 0;

    const elements = ["header", "footer", "barec2visor", "barec2details", "barec2ssm"];

    for (var i = 0; i < elements.length; i++) {
        const el = document.getElementById(elements[i]);
        if (el) {
            eraseHeight += el.offsetHeight;
        }
    }

    const updateElements = ["all-instances", "information", "ssm-instances", "ssm-data"];

    for (var j = 0; j < updateElements.length; j++) {
        const updEl = document.getElementById(updateElements[j]);
        if (updEl) {
            updEl.style.height = windowHeight - eraseHeight + 'px';
        }
    }
}

/* Show and hide containers details and visor */
const showandhidedetailsvisor = () => {
    const c1 = document.getElementById('ec2-details');
    const c2 = document.getElementById('ec2-visor');
    const c3 = document.getElementById('ec2-ssm');
    const button1 = document.getElementById('detailsvisorbutton');
    const button2 = document.getElementById('visorssmbutton');

    if (window.getComputedStyle(c1).display === 'flex' && window.getComputedStyle(c2).display === 'none') {
        c1.style.display = 'none';
        c2.style.display = 'flex';
        button1.innerHTML = "Go to Details";
        button2.innerHTML = "Go to SSM";
        button2.style.display = 'flex';
    } else {
        c1.style.display = 'flex';
        c2.style.display = 'none';
        c3.style.display = 'none';
        button1.innerHTML = "Go to Visor";
        button2.style.display = 'none';
    }
}

/* Show and hide containers SSM and visor */
const showandhidevisorssm = () => {
    const c1 = document.getElementById('ec2-visor');
    const c2 = document.getElementById('ec2-ssm');
    const button = document.getElementById('visorssmbutton');

    if (window.getComputedStyle(c1).display === 'flex' && window.getComputedStyle(c2).display === 'none') {
        c1.style.display = 'none';
        c2.style.display = 'flex';
        button.innerHTML = "Go to Visor";
    } else {
        c1.style.display = 'flex';
        c2.style.display = 'none';
        button.innerHTML = "Go to SSM";
    }
}

/* Danger alert */
const showdangeralert = (text) => {
    // Create div container
    const divElement = document.createElement('div');
    divElement.classList.add('alert', 'alert-danger', 'customalert', 'alert-dismissible', 'fade', 'show', 'text-center');
    divElement.setAttribute('role', 'alert');

    // Create strong
    const strongElement = document.createElement('strong');
    strongElement.classList.add('informationheader');
    strongElement.textContent = 'Oops!';
    divElement.appendChild(strongElement);

    // Create hr
    const hrElement = document.createElement('hr');
    hrElement.classList.add('alertline');
    divElement.appendChild(hrElement);

    // Create message container
    const messageElement = document.createElement('div');
    messageElement.textContent = text;
    divElement.appendChild(messageElement);

    // Create button to close alert
    const buttonElement = document.createElement('button');
    buttonElement.setAttribute('type', 'button');
    buttonElement.classList.add('btn-close');
    buttonElement.setAttribute('data-bs-dismiss', 'alert');
    buttonElement.setAttribute('aria-label', 'Close');
    divElement.appendChild(buttonElement);

    // Add container to document
    document.body.appendChild(divElement);
}

/* Show info alert */
const createElementWithMessage = (message, data) => {
    var messageElement = document.createElement('div');
    var response = document.createElement('span');

    messageElement.innerHTML = message + ': ';
    response.innerHTML = data;

    messageElement.style.fontWeight = "bold";
    response.style.fontWeight = "normal";
    response.style.overflowWrap = "break-word";

    messageElement.appendChild(response);

    return messageElement;
}

const showinfoalert = (metadata, region) => {
    // Create div container
    const divElement = document.createElement('div');
    divElement.classList.add('alert', 'alert-info', 'customalert', 'alert-dismissible', 'fade', 'show');
    divElement.setAttribute('role', 'alert');

    // Create strong
    const strongElement = document.createElement('strong');
    strongElement.classList.add('informationheader', 'text-center');
    strongElement.textContent = 'Information';
    divElement.appendChild(strongElement);

    // Create hr
    const hrElement = document.createElement('hr');
    hrElement.classList.add('alertline');
    divElement.appendChild(hrElement);

    // Create message containers
    divElement.appendChild(createElementWithMessage('Region', region));
    divElement.appendChild(createElementWithMessage('HTTP Status Code', metadata['HTTPStatusCode']));
    divElement.appendChild(createElementWithMessage('Date', metadata['HTTPHeaders']));
    divElement.appendChild(createElementWithMessage('Request Id', metadata['RequestId']));
    divElement.appendChild(createElementWithMessage('Retry Attempts', metadata['RetryAttempts']));

    // Create button to close alert
    const buttonElement = document.createElement('button');
    buttonElement.setAttribute('type', 'button');
    buttonElement.classList.add('btn-close');
    buttonElement.setAttribute('data-bs-dismiss', 'alert');
    buttonElement.setAttribute('aria-label', 'Close');
    divElement.appendChild(buttonElement);

    // Add container to document
    document.body.appendChild(divElement);
}

/* Get actual time with milliseconds */
const getactualtime = () => {
    time = new Date;
    return `${time.getHours()}:${time.getMinutes()}:${time.getSeconds()}.${time.getMilliseconds()}`;
};

/* Get actual datetime */
const getactualdatetime = () => {
    return ((date) => date.getFullYear()+'-'+('0' + (date.getMonth()+1)).slice(-2)+'-'+('0' + date.getDate()).slice(-2) + ' ' + ('0' + date.getHours()).slice(-2) + ':' + ('0' + date.getMinutes()).slice(-2) + ':' + ('0' + date.getSeconds()).slice(-2))(new Date())
}

/* Get actual datetime with milliseconds */
const getactualfulldatetime = () => {
    return ((date) => date.getFullYear()+'-'+('0' + (date.getMonth()+1)).slice(-2)+'-'+('0' + date.getDate()).slice(-2) + ' ' + ('0' + date.getHours()).slice(-2) + ':' + ('0' + date.getMinutes()).slice(-2) + ':' + ('0' + date.getSeconds()).slice(-2) + ':' + ('0' + date.getMilliseconds()).slice(-3))(new Date())
}

/* Footer clock */
const startTime = () => { let today=new Date(); let h=today.getHours(); let m=today.getMinutes(); let s=today.getSeconds(); m=checkTime(m); s=checkTime(s); document.getElementById('clock').innerHTML=h+":"+m+":"+s;t=setTimeout(startTime, 500);}
const checkTime = (i) => { if (i < 10) {i = "0" + i;} return i; }
const date = new Date();
const current_date = date.getDate()+"/"+(date.getMonth()+1)+"/"+ date.getFullYear()+",";
document.getElementById("date").innerHTML = current_date;

/* LISTENERS */

window.addEventListener('load', updateHeights);
window.addEventListener('resize', updateHeights);

window.addEventListener('click', function(event) {
    if (event.target == overlay) {
        document.getElementById('history').className = 'container-fluid d-none';
        document.getElementById('monitor').className = 'container-fluid d-none';
        document.getElementById('containerexportdata').className = 'container-fluid d-none';
        document.getElementById('overlay').className = 'd-none';
    }
});

document.getElementById('detailsvisorbutton').addEventListener('click', showandhidedetailsvisor);

if (document.getElementById('visorssmbutton')){
    document.getElementById('visorssmbutton').addEventListener('click', showandhidevisorssm);
}

window.onload = () => {
    startTime();
};