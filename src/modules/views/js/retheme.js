let theme = window.localStorage.getItem("theme");
const iconSwitch = [...document.getElementsByClassName("iconSwitch")];
if(theme || window.matchMedia("(prefers-color-scheme: dark)").matches){
    if(!theme){
        window.localStorage.setItem("theme", "dark");
    }
    document.body.classList.add("dark");
    iconSwitch.forEach(icon => {
        icon.classList.remove("fa-moon");
        icon.classList.add("fa-sun");
    })
}
function retheme(){
    console.log("hi");
    let hasClass = document.body.classList.contains("dark");
    if(hasClass){
        window.localStorage.removeItem("theme");
        document.body.classList.remove("dark");
        iconSwitch.forEach(icon => {
            icon.classList.add("fa-moon");
            icon.classList.remove("fa-sun");
        })
    }else{
        document.body.classList.add("dark");
        window.localStorage.setItem("theme", "dark");
        iconSwitch.forEach(icon => {
            icon.classList.remove("fa-moon");
            icon.classList.add("fa-sun");
        })
    }
}

[...document.getElementsByClassName("rethemeButton")].forEach((button) => {
    button.addEventListener("click", retheme);
})