let theme = window.localStorage.getItem("theme");
if(theme){
    document.body.classList.add("dark");
}
function retheme(){
    let curTheme = window.localStorage.getItem("theme");
    if(curTheme){
        window.localStorage.removeItem("theme");
        document.body.classList.remove("dark");
    }else{
        document.body.classList.add("dark");
        window.localStorage.setItem("theme", "dark");
    }
}