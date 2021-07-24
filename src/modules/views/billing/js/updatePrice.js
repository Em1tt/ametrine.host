let priceTag = document.querySelectorAll(".fullPrice"),
    beginningPrice = document.querySelector(".beginningPrice"),
    locations = document.querySelector("#location"),
    oss = document.querySelector("#os"),
    cycles = document.querySelector("#cycle"),
    addons = document.querySelectorAll(".addon"),
    setupPrice = document.querySelector(".setupPrice"),
    couponFloat = 1,
    recurringCouponFloat = 1;
let updatePrice = () => {
    const chosenLocation = locations.options[locations.selectedIndex],
          chosenOS = oss.options[oss.selectedIndex],
          chosenCycle = cycles.options[cycles.selectedIndex];
    
    let addonPrice = 0

    Array.prototype.forEach.call(addons, (addon) => {
        addonPrice += addon.options[addon.selectedIndex].value
    })
    Array.prototype.forEach.call(priceTag, (tag) => {
        if(tag.classList.contains("recurring")){ //RECURRING
            tag.innerHTML = (((parseFloat(beginningPrice.innerHTML) + parseFloat(chosenLocation.value) + parseFloat(chosenOS.value) + parseFloat(addonPrice)) * parseFloat(chosenCycle.value)) * recurringCouponFloat).toFixed(2);
        }else{ //FIRST PAYMENT
        tag.innerHTML = (((parseFloat(beginningPrice.innerHTML) + parseFloat(chosenLocation.value) + parseFloat(chosenOS.value) + parseFloat(addonPrice)) * parseFloat(chosenCycle.value) + parseFloat(setupPrice.innerHTML)) * couponFloat).toFixed(2);
        }
    })

}