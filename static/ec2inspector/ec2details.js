/* EC2 DETAILS */
const getgraphics = () => {

    if (document.getElementById("barregionsec2details").value == ""){
        return;
    }

    document.getElementById("graphicsdata").style.display = "none";
    document.getElementById("loading").style.display = "flex";
    const region = document.getElementById("barregionsec2details").value;
    
    $.ajax({
        url: "/get_graphics",
        type: "GET",
        data: {region: region},
        dataType: 'json',
        success: function(response) {

            if (response['nodata'] !== "nodata"){
                for (let key in response) {
                    if (document.getElementById(key) === null){
                        const newimage = document.createElement("img");
                        newimage.id = key;
                        newimage.classList.add("graphic", "col-4");
                        document.getElementById("graphicsdata").appendChild(newimage)
                    }
                    document.getElementById(key).src = "data:image/png;base64," + response[key];
                }
            } else {
                showdangeralert('No instances was found in ' + region);
            }

            document.getElementById("loading").style.display = "none";
            document.getElementById("graphicsdata").style.display = "flex";
            document.getElementById("graphicsdata").setAttribute("data-region", region);

        }
    });
    
}

/* Make graphics sortable */
const sortableInstance = new Sortable(graphicsdata, {
    animation: 200,
    ghostClass: 'blue-background-class'
});

const exportgraphics = () => {
    window.location.href = '/export_graphics';
}

const col12 = () => {
    const container = document.getElementById("graphicsdata").querySelectorAll("img");
    container.forEach((imgElement) => {
        imgElement.classList.add("col-12");
        imgElement.classList.remove("col-3");
        imgElement.classList.remove("col-4");
        imgElement.classList.remove("col-6");  
    });
}

const col6 = () => {
    const container = document.getElementById("graphicsdata").querySelectorAll("img");
    container.forEach((imgElement) => {
        imgElement.classList.add("col-6");
        imgElement.classList.remove("col-3");
        imgElement.classList.remove("col-4");
        imgElement.classList.remove("col-12");  
    });
}

const col4 = () => {
    const container = document.getElementById("graphicsdata").querySelectorAll("img");
    container.forEach((imgElement) => {
        imgElement.classList.add("col-4");
        imgElement.classList.remove("col-3");
        imgElement.classList.remove("col-6");
        imgElement.classList.remove("col-12");
    });
}

const col3 = () => {
    const container = document.getElementById("graphicsdata").querySelectorAll("img");
    container.forEach((imgElement) => {
        imgElement.classList.add("col-3");
        imgElement.classList.remove("col-6");
        imgElement.classList.remove("col-4");
        imgElement.classList.remove("col-12");  
    });
}

/* LISTENERS */
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('getgraphics').addEventListener('click', getgraphics);
    document.getElementById('exportgraphics').addEventListener('click', exportgraphics);
    document.getElementById('col12').addEventListener('click', col12);
    document.getElementById('col6').addEventListener('click', col6);
    document.getElementById('col4').addEventListener('click', col4);
    document.getElementById('col3').addEventListener('click', col3);
});
