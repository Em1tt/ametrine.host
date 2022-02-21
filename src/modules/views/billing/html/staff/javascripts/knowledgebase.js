(async () => {
  try {
    const response = await axios.get("/api/knowledgebase/tags");

    VirtualSelect.init({
      ele: "#searchbar",
      options: response.data.map((i) => {
        return { label: i, value: i };
      }),
      multiple: true,
      search: true,
      placeholder: "Find articles with tags",
      showValueAsTags: true,
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
})();
