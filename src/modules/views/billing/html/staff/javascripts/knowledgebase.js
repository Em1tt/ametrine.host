(async () => {
  const params = new Proxy(new URLSearchParams(window.location.search), {
    get: (searchParams, prop) => searchParams.get(prop),
  });
  try{
    const finished = document.querySelector(".checkbox #finished");
    const staff = document.querySelector(".checkbox #staff");
    const unfinished = document.querySelector(".checkbox #unfinished");
    finished.removeAttribute("checked");
    staff.removeAttribute("checked");
    unfinished.removeAttribute("checked");
    finished.addEventListener("change", () => {
      window.location.href = `/billing/staff/knowledgebase/articles?state=1`;
    });
    staff.addEventListener("change", () => {
      window.location.href = `/billing/staff/knowledgebase/articles?state=2`;
    });
    unfinished.addEventListener("change", () => {
      window.location.href = `/billing/staff/knowledgebase/articles?state=0`;
    });
  }catch(e){
    console.log(e);
  }
  try {
    const response = await axios.get("/api/knowledgebase/tags");
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
      showValueAsTags: true,
      allowNewOption: true,
    });
  } catch (e) {
    console.error(e);
  }
  try {
    const categories = await axios.get("/api/knowledgebase/categories");
    document.getElementById("knowledgebase-categories").innerHTML = "";
    categories.data.forEach(category => {
      const anchor = document.createElement("a");
      anchor.style = `border-color: ${category.color}`;
      anchor.href = `/billing/staff/knowledgebase/articles?category=${category.id}`;
      const header = document.createElement("h2");
      header.innerText = category.name;
      header.classList.add("header2");
      const description = document.createElement("p");
      description.innerText = category.description;
      anchor.appendChild(header);
      anchor.appendChild(description);
      document.getElementById("knowledgebase-categories").appendChild(anchor);
    })
  } catch (e) {
    console.error(e);
  }
  try{
    document.getElementById("tag-search").addEventListener("submit", (event) => {
      event.preventDefault();
      let tags = document.getElementById("searchbar").getSelectedOptions();
      tags = encodeURIComponent(JSON.stringify(tags.map(i => i.value)));
      window.location.href = `/billing/staff/knowledgebase/articles?tags=${tags}`;
    });
  }catch(e){
    console.error(e);
  }
  try{
    let button = document.getElementById("article-new")
    button.addEventListener("click", async (e) => {
      button.setAttribute("disabled", true);
      const response = await axios.post(`/api/knowledgebase/create`, {
        tags: "unfinished"
      });
      window.location.href = `/billing/staff/knowledgebase/${response.data.article_id}/editor`;
    });
  }catch(e){
    console.error(e);
  }
})();
