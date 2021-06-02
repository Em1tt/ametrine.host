$(document).on("scroll resize", () => {
    if ($window.scrollTop() != 0) {
        $(".back-to-top").addClass("back-to-top-display");
    } else {
        $(".back-to-top").removeClass("back-to-top-display");
    }
});

const topFunction = () => {
    $window.scrollTop(0);
}