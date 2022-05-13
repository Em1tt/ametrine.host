const text = [...document.getElementsByClassName("poi")];
text.forEach((t, i) => {
    const tooltip = tippy(t, {
        content: ["<b>Finland</b><br><sup>Helsinki</sup>", "<b>Germany</b><br><sup>Falkenstein</sup>"][i],
        placement: "top",
        allowHTML: true
    });
    document.getElementById([...document.getElementById("map-buttons-wrapper").children][i].id).addEventListener("mouseenter", () => {
        tooltip.show();
    });
    document.getElementById([...document.getElementById("map-buttons-wrapper").children][i].id).addEventListener("mouseleave", () => {
        tooltip.hide();
    });
})