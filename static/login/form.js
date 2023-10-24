// Toggle type attribute and change eye display
document.getElementById("eyefunction").addEventListener('click', function () {    
    const formpassword = document.getElementById("formpassword");
    if (formpassword.type === "password") {
        formpassword.type = "text";
        document.getElementById("show_eye").style.display = "none";
        document.getElementById("hide_eye").style.display = "block";
      } else {
        formpassword.type = "password";
        document.getElementById("show_eye").style.display = "block";
        document.getElementById("hide_eye").style.display = "none";
      }
});