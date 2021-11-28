let button = document.getElementById("openNav");
let buttonIcon = document.getElementById("openNavIcon");
let navbar = document.getElementById("navbar");
function openNav(){
    if(buttonIcon.classList.contains("fa-bars")){ //Open
        document.body.style = "overflow: hidden;"
    }else{ //Close
        document.body.style = "overflow: auto;"
    }
    navbar.classList.toggle("navopen");
    buttonIcon.classList.toggle("fa-bars");
    buttonIcon.classList.toggle("fa-times");
}