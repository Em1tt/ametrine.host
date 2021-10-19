const text = [...document.getElementsByClassName("poi")];
let i = 0;
text.forEach(t => {
    tippy(t, {
        content: ["<b>Finland</b><br><sup>Helsinki</sup>", "<b>Germany</b><br><sup>Falkenstein</sup>"][i],
        placement: "top",
        allowHTML: true
    })
    i++;
})