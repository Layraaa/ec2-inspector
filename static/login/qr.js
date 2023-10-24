document.addEventListener('DOMContentLoaded', (event) => {
    const qrButton = document.getElementById('qrbutton');

    qrButton.addEventListener('click', () => {
        document.getElementById('qrcode').style.display = "block";
        qrButton.remove();
    });

    setTimeout(function() {
        document.getElementById('submitButton').removeAttribute('disabled');
    }, 4000);
});