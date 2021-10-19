const backtotop = document.getElementById("backToTop");
document.addEventListener("scroll", (event) => {
    window.scrollY <= 1 ? backtotop.classList.add("atTop") : backtotop.classList.remove("atTop");
})
function backToTop(){
    window.scrollTo(0, 0);
}