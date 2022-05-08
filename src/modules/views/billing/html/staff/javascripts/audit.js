(async () => {
    const params = new Proxy(new URLSearchParams(window.location.search), {
      get: (searchParams, prop) => searchParams.get(prop),
    });
    document.querySelector("#go-back")?.addEventListener("click", () => {
      history.back();
  });
  const el1 = document.querySelector("#searchbar1");
  const el2 = document.querySelector("#searchbar2");
    try {
      VirtualSelect.init({
        ele: "#searchbar1",
        multiple: true,
        search: true,
        placeholder: "Filter by user IDs",
        maxValues: 10,
        selectedValue: JSON.parse(params.userIDs),
        showValueAsTags: true,
        allowNewOption: true,
      });
      el1.addEventListener("change", (event) => {
        if(!el1.value.length) return;
        if(!el1.value.some(i => isNaN(parseInt(i)))) return;
        el1.setOptions(el1.options.filter(i => i.label != el1.options[el1.options.findIndex(o => isNaN(parseInt(o.label)))].label));
        el1.setValue(el1.options.map(o => o.label));
      })

    } catch (e) {
      console.error(e);
    }
    try {
      VirtualSelect.init({
        ele: "#searchbar2",
        options: [
          {label: "GET", value: "GET"},
          {label: "POST", value: "POST"},
          {label: "PUT", value: "PUT"},
          {label: "DELETE", value: "DELETE"},
          {label: "PATCH", value: "PATCH"},
          
        ],
        placeholder: "Filter by request methods",
        selectedValue: JSON.parse(params.methods),
        showValueAsTags: true,
        search: false,
        multiple: true
      });
      el2.querySelector(".vscomp-search-container").remove();

    } catch (e) {
      console.error(e);
    }
    document.querySelector("#filter").addEventListener("submit", async (event) => {
      event.preventDefault();
      const userIDs = el1.value;
      const methods = el2.value;
      const perPage = document.querySelector('.perPageButtons .button1[selected="true"]').innerText;
      console.log(perPage);
    });
})()