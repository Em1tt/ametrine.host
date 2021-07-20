const orderButtons = document.querySelectorAll(".orderButton");

let prepareOrderButtons = () => {
    [].forEach.call(orderButtons, (button) => {
        button.addEventListener("click", event => {
            order(event.target.id);
        });
    });
}

let order = async (id) => {
    location.href = `/billing/order?type=${location.pathname.slice(1).split("/")[1]}&id=${id}`;
}