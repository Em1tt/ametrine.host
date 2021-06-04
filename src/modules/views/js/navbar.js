$(document).on("scroll", () => {
    if ($(document).scrollTop() > 0) {
        $("nav").css("background-color", "#1b1c23");
    } else if ($(document).scrollTop() == 0 && document.body.clientWidth > 610) {
        $("nav").css("background-color", "rgba(0, 0, 0, 0)");
    }
})