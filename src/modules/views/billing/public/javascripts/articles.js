(async () => {
  const params = new Proxy(new URLSearchParams(window.location.search), {
    get: (searchParams, prop) => searchParams.get(prop),
  });
  try {
    const response = await axios.get(params.category == null ? "/api/knowledgebase/tags" : `/api/knowledgebase/tags?category=${params.category}`);
    VirtualSelect.init({
      ele: "#searchbar",
      options: response.data.map((i) => {
        return { label: i, value: i };
      }),
      multiple: true,
      search: true,
      placeholder: "Find articles with tags",
      selectedValue: JSON.parse(params.tags),
      showValueAsTags: true,
    });
  } catch (e) {
    console.error(e);
  }
  try {
    const tags = JSON.parse(params.tags);
    const response = await axios.get(`/api/knowledgebase/list?${params.category == null ? "": `category=${params.category}&`}tags=${encodeURIComponent(JSON.stringify(tags))}`);
    document.getElementById("articles-found-header").innerText = `Articles Found: ${response.data.length}`;
    document.getElementById("articles").innerHTML = "";
    response.data.forEach(articles => {
      const anchor = document.createElement("a");
      anchor.href = `/billing/knowledgebase/article/${articles.article_id}`;
      const h3 = document.createElement("h3");
      h3.classList.add("header2");
      h3.innerText = articles.header;
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
  try {
      const tags = JSON.parse(params.tags);
      const categories = await axios.get("/api/knowledgebase/categories");
      document.getElementById("knowledgebase-categories").innerHTML = "";
      categories.data.forEach(category => {
        const anchor = document.createElement("a");
        anchor.style = `border-color: ${category.color}`;
        anchor.href = tags?.length ? `/billing/knowledgebase/articles?tags=${encodeURIComponent(JSON.stringify(tags))}&category=${category.id}` : `/billing/knowledgebase/articles?category=${category.id}`;
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
  try {
    document.getElementById("tag-search").addEventListener("submit", (event) => {
      event.preventDefault();
      let tags = document.getElementById("searchbar").getSelectedOptions();
      tags = encodeURIComponent(JSON.stringify(tags.map(i => i.value)));
      window.location.href = params.category == null ? `/billing/knowledgebase/articles?tags=${tags}` : `/billing/knowledgebase/articles?category=${params.category}?tags=${tags}`;
    });
  } catch (e) {
    console.error(e);
  }
  try {
    const response = await axios.post("/api/knowledgebase/create", {
      tags: "hello,second,what",
      header: "Plugin installation",
      content: "hello",
      state: 1
    });
    console.log(response);
  } catch (e) {
    console.error(e);
  }
})()