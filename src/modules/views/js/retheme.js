let theme = window.localStorage.getItem("theme");
const iconSwitch = document.getElementById("iconSwitch");
if(theme){
    document.body.classList.add("dark");
    iconSwitch.classList.remove("fa-moon");
    iconSwitch.classList.add("fa-sun");
}
function retheme(){
    let curTheme = window.localStorage.getItem("theme");
    if(curTheme){
        window.localStorage.removeItem("theme");
        document.body.classList.remove("dark");
        iconSwitch.classList.add("fa-moon");
        iconSwitch.classList.remove("fa-sun");
    }else{
        document.body.classList.add("dark");
        window.localStorage.setItem("theme", "dark");
        iconSwitch.classList.remove("fa-moon");
        iconSwitch.classList.add("fa-sun");
    }
}