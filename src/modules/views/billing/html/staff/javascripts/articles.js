(async () => {
  const params = new Proxy(new URLSearchParams(window.location.search), {
    get: (searchParams, prop) => searchParams.get(prop),
  });
  document.querySelector("#go-back")?.addEventListener("click", () => {
    history.back();
});
  try {
    const response = await axios.get(params.category == null ? "/api/knowledgebase/tags" : `/api/knowledgebase/tags?category=${params.category}`);
    const totalTags = response.data.map((i) => {
      return { label: i, value: i};
    });
    totalTags.unshift({ label: "unfinished", value: "unfinished" });
    VirtualSelect.init({
      ele: "#searchbar",
      options: totalTags,
      multiple: true,
      search: true,
      placeholder: "Find articles with tags",
      selectedValue: JSON.parse(params.tags),
      showValueAsTags: true,
      allowNewOption: true,
    });

  } catch (e) {
    console.error(e);
  }
  try {
    const tags = JSON.parse(params.tags);
    console.log(params.state);
    const response = await axios.get(`/api/knowledgebase/list?limit=50&page=${params.page}&${params.category == null ? "": `category=${params.category}&`}tags=${encodeURIComponent(JSON.stringify(tags))}&state=${params.state ? params.state : 1 }`);
    console.log(response);
    document.getElementById("articles").innerHTML = "";
    response.data.forEach(articles => {
      const anchor = document.createElement("a");
      anchor.href = `/billing/staff/knowledgebase/${articles.article_id}`;
      const h3 = document.createElement("h3");
      h3.classList.add("header2");
      h3.innerText = articles.header == "false" ? "Unnamed" : articles.header;
      anchor.appendChild(h3);
      articles.tags.split(",").forEach(tag => {
        if(tag == "") return;
        const span = document.createElement("span");
        span.innerText = tag;
        anchor.appendChild(span);
      });
      document.getElementById("articles").appendChild(anchor);
    });
  } catch (e) {
    console.error(e);
  }

try{
  const finished = document.querySelector(".checkbox #finished");
  const staff = document.querySelector(".checkbox #staff");
  const unfinished = document.querySelector(".checkbox #unfinished");
  const tags = encodeURIComponent(params.tags)
  if(parseInt(params.state) == 0){
    unfinished.setAttribute("checked", true);
  }else if(parseInt(params.state) == 2){
    staff.setAttribute("checked", true);
  }else{
    finished.setAttribute("checked", true)
  }
  finished.addEventListener("change", () => {
    window.location.href = `/billing/staff/knowledgebase/articles?page=${params.page}&${params.category == null ? "": `category=${params.category}&`}tags=${tags}&state=1`;
  });
  staff.addEventListener("change", () => {
    window.location.href = `/billing/staff/knowledgebase/articles?page=${params.page}&${params.category == null ? "": `category=${params.category}&`}tags=${tags}&state=2`;
  });
  unfinished.addEventListener("change", () => {
    window.location.href = `/billing/staff/knowledgebase/articles?page=${params.page}&${params.category == null ? "": `category=${params.category}&`}tags=${tags}&state=0`;
  });
}catch(e){
  console.log(e);
}
  try {
      const tags = JSON.parse(params.tags);
      const categories = await axios.get("/api/knowledgebase/categories");
      document.getElementById("knowledgebase-categories").innerHTML = "";
      categories.data.forEach(category => {
        console.log(category);
        const anchor = document.createElement("a");
        anchor.style = `border-color: ${category.color}`;
        anchor.href = `/billing/knowledgebase/articles?page=${params.page}&category=${category.id}&tags=${encodeURIComponent(JSON.stringify(tags))}`;
        const header = document.createElement("h2");
        header.innerText = decodeURIComponent(window.atob(category.name));
        header.classList.add("header2");
        const description = document.createElement("p");
        description.innerText = decodeURIComponent(window.atob(category.description));
        anchor.appendChild(header);
        anchor.appendChild(description);
        document.getElementById("knowledgebase-categories").appendChild(anchor);
      })
  } catch (e) {
    console.error(e);
  }
  try {
    const tags = JSON.parse(params.tags);
    const response = await axios.get(`/api/knowledgebase/count?${params.category == null ? "": `category=${params.category}&`}tags=${encodeURIComponent(JSON.stringify(tags))}&state=${params.state ? params.state : 1 }`);
    const articleAmount = response.data;
    document.getElementById("articles-found-header").innerText = `Articles Found: ${response.data}`;
    let page = params.page || 1;
      if(parseInt(page)*50 < parseInt(articleAmount)){
        [...document.querySelectorAll(".rightButton")].forEach((button) => {
          button.removeAttribute("disabled");
          button.addEventListener("click", () => {
            window.location.href = `/billing/staff/knowledgebase/articles?page=${parseInt(page)+1}&${params.category == null ? "": `category=${params.category}&`}tags=${encodeURIComponent(JSON.stringify(tags))}`
          });
        });
      }
    if(parseInt(page) > 1){
      [...document.querySelectorAll(".leftButton")].forEach((button) => {
        button.removeAttribute("disabled");
        button.addEventListener("click", () => {
          window.location.href = `/billing/staff/knowledgebase/articles?page=${parseInt(page)-1}&${params.category == null ? "": `category=${params.category}&`}tags=${encodeURIComponent(JSON.stringify(tags))}`
        });
      });
    }
    [...document.querySelectorAll("leftButton")].forEach(() => {

    });
  } catch (e) {
    console.error(e);
  }
  try {
    document.getElementById("tag-search").addEventListener("submit", (event) => {
      event.preventDefault();
      let tags = document.getElementById("searchbar").getSelectedOptions();
      tags = encodeURIComponent(JSON.stringify(tags.map(i => i.value)));
      window.location.href = `/billing/staff/knowledgebase/articles?page=${params.page}&${params.category == null ? "": `category=${params.category}&`}tags=${tags}`;
    });
  } catch (e) {
    console.error(e);
  }
  try{
    let button = document.getElementById("article-new")
    button.addEventListener("click", async (e) => {
      button.setAttribute("disabled", true);
      const response = await axios.post(`/api/knowledgebase/create`);
      console.log(response);
      window.location.href = `/billing/staff/knowledgebase/${response.data.article_id}/editor`;
    });
  }catch(e){
    console.error(e);
  }
})()