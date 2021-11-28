let theme = window.localStorage.getItem("theme");
const iconSwitch = [...document.getElementsByClassName("iconSwitch")];
if(theme){
    document.body.classList.add("dark");
    iconSwitch.forEach(icon => {
        icon.classList.remove("fa-moon");
        icon.classList.add("fa-sun");
    })
}
function retheme(){
    let curTheme = window.localStorage.getItem("theme");
    if(curTheme){
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