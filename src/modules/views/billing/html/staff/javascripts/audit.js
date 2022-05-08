(async () => {
    const params = new Proxy(new URLSearchParams(window.location.search), {
      get: (searchParams, prop) => searchParams.get(prop),
    });
    document.querySelector("#go-back")?.addEventListener("click", async () => {
      history.back();
  });
  try{
    console.log(params.userIDs, params.methods)
    const response = await axios.get(`/api/audit?userIDs=${params.userIDs ? params.userIDs : ""}&methods=${params.methods ? params.methods : ""}&pageLimit=${params.perPage ? params.perPage : ""}`);
    console.log(response);
    const logsWrapper = document.querySelector("#logsWrapper");
    response.data.forEach(async log => {
      const div = document.createElement("div");
      const p = document.createElement("p");
      const h4 = document.createElement("h4");
      const a = document.createElement("a");

      div.appendChild(p);
      div.appendChild(h4);

      p.innerText = new Date(log.createdIn).toDateString();
      h4.innerText = log.method.toUpperCase() + " " + log.page
      if(Object.keys(log.body).length != 0){
        a.innerText = "View Body";
        div.appendChild(a);
        if(log?.body?.content){
          const logb = Object.values(log.body.content.ops);
            await logb.forEach(operation => {
              if(operation?.insert?.image) operation.insert.image = `<a class=intense data-image='${operation.insert.image}'>b64imgObj</a>`;
            });
            a.addEventListener("click", () =>{
              Swal.fire({
                  title: "Log Body",
                  html: `<pre class="left-align">${JSON.stringify(logb, undefined, 4)}</pre>`,
                  didOpen: () => {
                    Intense(document.querySelectorAll(".intense"));
                  }
              });
          })
          }else{
              a.addEventListener("click", () =>{
              Swal.fire({
                  title: "Log Body",
                  html: `<pre class="left-align">${JSON.stringify(log.body, undefined, 4)}</pre>`
              });
            })
          }
      }

      logsWrapper.appendChild(div);
    });
  }catch(e){
    console.log(e);
  }
  const el1 = document.querySelector("#searchbar1");
  const el2 = document.querySelector("#searchbar2");
    try {
      VirtualSelect.init({
        ele: "#searchbar1",
        multiple: true,
        search: true,
        placeholder: "Filter by user IDs",
        maxValues: 10,
        selectedValue: decodeURIComponent(params.userIDs).split(","),
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
        selectedValue: decodeURIComponent(params.methods).split(","),
        showValueAsTags: true,
        search: false,
        multiple: true
      });
      el2.querySelector(".vscomp-search-container").remove();

    } catch (e) {
      console.error(e);
    }

    if(parseInt(params.perPage)){
      document.querySelector('.button1[selected="true"]').removeAttribute("selected");
      [...document.querySelectorAll('.perPageButtons .button1')].find(i => i.innerText == params.perPage).setAttribute("selected", "true");
    }
    document.querySelector("#filter").addEventListener("submit", async (event) => {
      event.preventDefault();
      const userIDs = el1.value;
      const methods = el2.value;
      const perPage = document.querySelector('.perPageButtons .button1[selected="true"]').innerText;
      window.location.href = window.location.href = `/billing/staff/audit?userIDs=${userIDs ? encodeURIComponent(userIDs) : ""}&methods=${methods ? encodeURIComponent(methods) : ""}&perPage=${perPage}`
    });
    document.querySelectorAll(".perPageButtons .button1").forEach(button => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        document.querySelector('.button1[selected="true"]').removeAttribute("selected");
        button.setAttribute("selected", "true");
      })
    })
})()