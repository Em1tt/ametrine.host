/* eslint-disable no-undef */
const themeMap = {
    dark: "neomorphism",
    neomorphism: "dark"
};
document.addEventListener("load", () => {
    const theme = localStorage.getItem('theme') || (tmp = Object.keys(themeMap)[0],
    localStorage.setItem('theme', tmp),
        tmp);
    const bodyClass = document.body.classList;
bodyClass.add(theme);

document.getElementById('theme-button').addEventListener("click", toggleTheme);

function toggleTheme() {
    const current = localStorage.getItem('theme');
    const next = themeMap[current];

    bodyClass.replace(current, next);
    localStorage.setItem('theme', next);
}
});