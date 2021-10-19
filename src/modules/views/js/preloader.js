window.onload = function (){
  let preloader = document.getElementById("preloader");
  preloader.classList.add("finishedLoading");
  setTimeout(() => {
    preloader.remove();
  }, 500);
  document.body.style = "overflow: auto;";
}