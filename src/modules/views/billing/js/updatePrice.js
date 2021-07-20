let priceTag = document.querySelector(".fullPrice"),
    beginningPrice = document.querySelector(".beginningPrice"),
    locations = document.querySelector("#location"),
    oss = document.querySelector("#os"),
    cycles = document.querySelector("#cycle"),
    addons = document.querySelectorAll(".addon");
let updatePrice = () => {
    const chosenLocation = locations.options[locations.selectedIndex],
          chosenOS = oss.options[oss.selectedIndex],
          chosenCycle = cycles.options[cycles.selectedIndex];
    
    let addonPrice = 0

    Array.prototype.forEach.call(addons, (addon) => {
        console.log(addon);
        addonPrice += addon.options[addon.selectedIndex].value
    })
    console.log(addonPrice, parseFloat(beginningPrice.innerHTML), parseFloat(chosenLocation.value), parseFloat(chosenOS.value), chosenCycle.value)
    priceTag.innerHTML = ((parseFloat(beginningPrice.innerHTML) + parseFloat(chosenLocation.value) + parseFloat(chosenOS.value) + parseFloat(addonPrice)) * parseFloat(chosenCycle.value)).toFixed(2);
}