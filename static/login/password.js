const checkPassword = (password) => {
    let strongPassword = new RegExp('(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9])(?=.{10,})')
    let mediumPassword = new RegExp('((?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9])(?=.{6,}))|((?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9])(?=.{8,}))')

    // Strong password
    if (strongPassword.test(password)) {
        document.getElementById('formpassword').style.backgroundColor = '#90ee90';
    }
    // Medium password
    else if (mediumPassword.test(password)) {
        document.getElementById('formpassword').style.backgroundColor = '#fdc389';
    }
    // Void password
    else if (password === ""){
        document.getElementById('formpassword').style.backgroundColor = '#fff';
    }
    // Weak password
    else {
        document.getElementById('formpassword').style.backgroundColor = '#ff9c9a';
    }
}

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('formpassword').addEventListener('input', function() {
        checkPassword(this.value);
    });
});