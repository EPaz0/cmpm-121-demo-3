// todo
//test
const button = document.createElement("button");

button.innerText = "Click me!";

button.addEventListener("click", () => {
  alert("you clicked the button!");
});

document.body.appendChild(button);
