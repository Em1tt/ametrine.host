/* eslint-disable no-undef */
const themeMap = {
    dark: "light",
    light: "amoled",
    amoled: "summer",
    summer: "lemon",
    lemon: "dark"
};

const theme = localStorage.getItem('theme') || (tmp = Object.keys(themeMap)[0],
    localStorage.setItem('theme', tmp),
        tmp);
const bodyClass = document.body.classList;
bodyClass.add(theme);

function toggleTheme() {
    const current = localStorage.getItem('theme');
    const next = themeMap[current];

    bodyClass.replace(current, next);
    localStorage.setItem('theme', next);
}

document.getElementById('theme-button').addEventListener("click", toggleTheme);