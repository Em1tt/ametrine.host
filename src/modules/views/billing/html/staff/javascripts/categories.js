function createElement(tag,options){
    return Object.assign(document.createElement(tag),options);
}
let editMode = false;
const hText = document.querySelector(".formWrapper > h3").innerHTML;
let curEditID = false;
function edit(name, description, id, color, minPermission){
    const header = document.querySelector(".formWrapper > h3");
    editMode = !editMode;
    header.innerHTML = editMode ? '<i class="fa fa-tools"></i> Edit a category' : hText;
    if(editMode){
        document.querySelector("form #name").value = decodeURIComponent(window.atob(name));
        document.querySelector("form #description").value = decodeURIComponent(window.atob(description));
        document.querySelector("form #color").value = color;
        document.querySelector("form #minimal-permission").value = minPermission;
        document.querySelector("form#categoryForm").append(createElement("button", {className: "button1", id: "discardButton", innerText: "Discard changes", type: "reset"}));
        document.querySelector("#discardButton").addEventListener("click", () => {edit()});
        curEditID = id;
    }else{
        document.querySelector("form#categoryForm").reset();
        document.querySelector("#discardButton").remove();
        curEditID = false;
    }
}
(async () => {
    try{
        const response = await axios.get("/api/knowledgebase/categories");
        response.data.forEach(category => {
            const div = createElement("div", {style: `border-color: ${category.color}`});
            const span1 = createElement("span");
            const span2 = createElement("span");
            const h4 = createElement("h4", {innerText: decodeURIComponent(window.atob(category.name))});
            const description = createElement("p", {innerText: decodeURIComponent(window.atob(category.description))});
            const data = createElement("p", {innerText: `ID: ${category.id} | Color: ${category.color ? category.color : "none"} | Min. Permission to read/edit: ${category.minimum_permission}`});
            span1.append(h4, description, data);
            const editButton = createElement("button", {innerHTML: '<i class="fa fa-tools"></i>'});
            editButton.addEventListener("click", () => {
                edit(category.name, category.description, category.id, category.color, category.minimum_permission);
            })
            const removeButton = createElement("button", {innerHTML: '<i class="fa fa-trash"></i>'});
            removeButton.addEventListener("click", () => {
                Swal.fire({
                    title: "Really delete this category?",
                    icon: "question",
                    showCancelButton: true,
                    preConfirm: async () => {
                      try {
                        const response = await axios.delete("/api/knowledgebase/categories", {
                            data: {
                                id: category.id
                            }
                        });
                        console.log(response);
                        location.reload();
                      } catch (e) {
                        Swal.showValidationMessage(e.response.data);
                        console.log(e);
                      }
                    },
                  })
            });
            span2.append(editButton, removeButton);
            div.append(span1, span2);
            document.querySelector("#categoryWrapper").appendChild(div);

        })
        console.log(response);
    }catch(e){
        console.log(e);
    }
    try{ //Form validation
        document.querySelector("form#categoryForm").addEventListener("submit", async (event) => {
            event.preventDefault();
            const name        = document.querySelector("form#categoryForm #name").value,
                description   = document.querySelector("form#categoryForm #description").value,
                color         = document.querySelector("form#categoryForm #color").value,
                minPermission = document.querySelector("form#categoryForm #minimal-permission").value
            if(!name || !description || !color || !minPermission) return;
            if(curEditID){
                await axios.patch("/api/knowledgebase/categories", {
                    name: name, description: description, color: color, minPermission: minPermission, id: parseInt(curEditID)
                }).then(() => {
                    location.reload();
                }).catch(e => {
                    console.log(e.response.data);
                });
            }else{
                await axios.post("/api/knowledgebase/categories", {
                    name: name, description: description, color: color, minPermission: minPermission
                }).then(() => {
                    location.reload();
                }).catch(e => {
                    console.log(e.response.data);
                });
            }
        })
    }catch(e){
        console.log(e);
    }
})();