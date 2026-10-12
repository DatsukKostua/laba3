const API_URL = "https://dummyjson.com/products?limit=100";
const CURRENCY_FORMATTER = new Intl.NumberFormat("uk-UA", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

let allItems = [];
let selectedItems = [];

const productGrid = document.querySelector("#product-grid");
const catalogStatus = document.querySelector("#catalog-status");
const catalogCount = document.querySelector("#catalog-count");
const searchInput = document.querySelector("#search-input");
const categoryFilter = document.querySelector("#category-filter");
const sortOrder = document.querySelector("#sort-order");
const cartItems = document.querySelector("#cart-items");
const cartCount = document.querySelector("#cart-count");
const headerCartCount = document.querySelector("#header-cart-count");
const cartTotal = document.querySelector("#cart-total");
const cartGuidance = document.querySelector("#cart-guidance");
const orderForm = document.querySelector("#order-form");
const submitOrder = document.querySelector("#submit-order");
const formStatus = document.querySelector("#form-status");
const checkoutLayout = document.querySelector(".checkout-layout");
const successPanel = document.querySelector("#success-panel");
const successMessage = document.querySelector("#success-message");
const orderSummary = document.querySelector("#order-summary");
const newOrderButton = document.querySelector("#new-order-button");

const formFields = {
  customerName: {
    input: document.querySelector("#customer-name"),
    error: document.querySelector("#name-error"),
  },
  email: {
    input: document.querySelector("#customer-email"),
    error: document.querySelector("#email-error"),
  },
  phone: {
    input: document.querySelector("#customer-phone"),
    error: document.querySelector("#phone-error"),
  },
  note: {
    input: document.querySelector("#order-note"),
    error: document.querySelector("#note-error"),
  },
};

function formatPrice(price) {
  return CURRENCY_FORMATTER.format(price);
}

function getItemCountLabel(count) {
  const remainder10 = count % 10;
  const remainder100 = count % 100;
  let noun = "товарів";

  if (remainder10 === 1 && remainder100 !== 11) {
    noun = "товар";
  } else if (remainder10 >= 2 && remainder10 <= 4 && (remainder100 < 12 || remainder100 > 14)) {
    noun = "товари";
  }

  return `${count} ${noun}`;
}

function setCatalogStatus(message, state = "") {
  catalogStatus.replaceChildren();
  catalogStatus.dataset.state = state;
  catalogStatus.append(document.createTextNode(message));
}

function showLoading() {
  productGrid.replaceChildren();
  productGrid.setAttribute("aria-busy", "true");
  catalogCount.textContent = "";
  setCatalogStatus("Завантажуємо товари…");
}

function showError(message) {
  productGrid.replaceChildren();
  productGrid.setAttribute("aria-busy", "false");
  catalogCount.textContent = "";
  setCatalogStatus(message, "error");

  const retryButton = document.createElement("button");
  retryButton.className = "retry-button";
  retryButton.type = "button";
  retryButton.textContent = "Спробувати ще раз";
  retryButton.addEventListener("click", loadItems);
  catalogStatus.append(retryButton);
}

async function loadItems() {
  showLoading();

  try {
    const response = await fetch(API_URL);
    if (!response.ok) {
      throw new Error(`Помилка HTTP ${response.status}`);
    }

    const data = await response.json();
    if (!Array.isArray(data.products)) {
      throw new Error("У відповіді API немає масиву товарів.");
    }

    allItems = data.products;
    populateCategories();
    productGrid.setAttribute("aria-busy", "false");

    if (allItems.length === 0) {
      catalogCount.textContent = "";
      setCatalogStatus("Каталог поки що порожній.");
      renderCart();
      return;
    }

    setCatalogStatus("");
    applyCatalogFilters();
    renderCart();
  } catch (error) {
    console.error("Не вдалося завантажити каталог:", error);
    showError("Не вдалося завантажити каталог. Перевірте з’єднання та спробуйте ще раз.");
  }
}

function populateCategories() {
  const categories = [...new Set(allItems.map((item) => item.category).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "uk"),
  );

  categoryFilter.replaceChildren();
  const allCategories = document.createElement("option");
  allCategories.value = "";
  allCategories.textContent = "Усі категорії";
  categoryFilter.append(allCategories);

  for (const category of categories) {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category.replaceAll("-", " ");
    categoryFilter.append(option);
  }
}

function applyCatalogFilters() {
  const query = searchInput.value.trim().toLocaleLowerCase("uk");
  const category = categoryFilter.value;
  const items = allItems.filter((item) => {
    const searchableText = [item.title, item.brand, item.category, item.description]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase("uk");
    return (!query || searchableText.includes(query)) && (!category || item.category === category);
  });

  if (sortOrder.value === "price-asc") {
    items.sort((a, b) => a.price - b.price);
  } else if (sortOrder.value === "price-desc") {
    items.sort((a, b) => b.price - a.price);
  } else if (sortOrder.value === "rating") {
    items.sort((a, b) => b.rating - a.rating);
  }

  renderCatalog(items);
}

function createProductCard(item) {
  const card = document.createElement("article");
  card.className = "product-card";

  const imageWrap = document.createElement("div");
  imageWrap.className = "product-image-wrap";

  const image = document.createElement("img");
  image.className = "product-image";
  image.src = item.thumbnail || item.images?.[0] || "";
  image.alt = `Фото товару: ${item.title}`;
  image.loading = "lazy";
  image.addEventListener("error", () => {
    image.alt = `Зображення товару «${item.title}» недоступне`;
    image.removeAttribute("src");
  }, { once: true });
  imageWrap.append(image);

  const category = document.createElement("span");
  category.className = "product-category";
  category.textContent = (item.category || "інше").replaceAll("-", " ");
  imageWrap.append(category);

  const info = document.createElement("div");
  info.className = "product-info";

  const brand = document.createElement("p");
  brand.className = "product-brand";
  brand.textContent = item.brand || "Добірка крамниці";

  const title = document.createElement("h3");
  title.className = "product-title";
  title.textContent = item.title;

  const description = document.createElement("p");
  description.className = "product-description";
  description.textContent = item.description || "Деталі товару незабаром з’являться.";

  const meta = document.createElement("div");
  meta.className = "product-meta";

  const stock = document.createElement("span");
  stock.textContent = `Є в наявності: ${item.stock}`;

  const rating = document.createElement("span");
  rating.className = "rating";
  rating.textContent = `★ ${Number(item.rating).toFixed(1)}`;
  rating.setAttribute("aria-label", `Рейтинг ${Number(item.rating).toFixed(1)} з 5`);
  meta.append(stock, rating);

  const footer = document.createElement("div");
  footer.className = "product-card-footer";

  const price = document.createElement("span");
  price.className = "product-price";
  price.textContent = formatPrice(item.price);

  const addButton = document.createElement("button");
  addButton.className = "button button-primary product-add";
  addButton.type = "button";
  addButton.dataset.itemId = String(item.id);
  const isSelected = selectedItems.some((selected) => selected.id === item.id);
  addButton.disabled = isSelected;
  addButton.classList.toggle("is-added", isSelected);
  addButton.textContent = isSelected ? "У кошику ✓" : "Додати";
  addButton.setAttribute("aria-label", `${isSelected ? "Товар уже в кошику:" : "Додати до кошика:"} ${item.title}`);
  addButton.addEventListener("click", () => addItem(item.id));
  footer.append(price, addButton);

  info.append(brand, title, description, meta, footer);
  card.append(imageWrap, info);
  return card;
}

function renderCatalog(items) {
  productGrid.replaceChildren();
  productGrid.setAttribute("aria-busy", "false");
  catalogCount.textContent = getItemCountLabel(items.length);

  if (items.length === 0) {
    setCatalogStatus(
      allItems.length === 0
        ? "Каталог поки що порожній."
        : "За вашим запитом нічого не знайдено. Спробуйте змінити пошук або категорію.",
    );
    return;
  }

  setCatalogStatus("");
  const fragment = document.createDocumentFragment();
  for (const item of items) {
    fragment.append(createProductCard(item));
  }
  productGrid.append(fragment);
}

function addItem(id) {
  const item = allItems.find((product) => product.id === id);
  if (!item || selectedItems.some((selected) => selected.id === id)) {
    return;
  }

  selectedItems = [...selectedItems, item];
  renderCart();
  applyCatalogFilters();
}

function removeItem(id) {
  selectedItems = selectedItems.filter((item) => item.id !== id);
  renderCart();
  applyCatalogFilters();
}

function renderCart() {
  cartItems.replaceChildren();
  const total = selectedItems.reduce((sum, item) => sum + item.price, 0);
  const itemCount = selectedItems.length;
  cartCount.textContent = getItemCountLabel(itemCount);
  headerCartCount.textContent = String(itemCount);
  cartTotal.textContent = formatPrice(total);
  submitOrder.disabled = itemCount === 0;
  cartGuidance.textContent =
    itemCount === 0
      ? "Додайте товари з каталогу, щоб оформити замовлення."
      : "Видаліть непотрібні товари або заповніть форму, щоб завершити замовлення.";

  if (itemCount === 0) {
    const emptyMessage = document.createElement("p");
    emptyMessage.className = "empty-cart";
    emptyMessage.textContent = "Тут поки нічого немає — оберіть товар у каталозі вище.";
    cartItems.append(emptyMessage);
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const item of selectedItems) {
    const row = document.createElement("article");
    row.className = "cart-item";

    const image = document.createElement("img");
    image.className = "cart-item-image";
    image.src = item.thumbnail || item.images?.[0] || "";
    image.alt = `Фото товару: ${item.title}`;
    image.loading = "lazy";

    const details = document.createElement("div");
    const title = document.createElement("h3");
    title.className = "cart-item-title";
    title.textContent = item.title;
    const price = document.createElement("p");
    price.className = "cart-item-price";
    price.textContent = formatPrice(item.price);
    details.append(title, price);

    const removeButton = document.createElement("button");
    removeButton.className = "remove-button";
    removeButton.type = "button";
    removeButton.textContent = "×";
    removeButton.setAttribute("aria-label", `Видалити з кошика: ${item.title}`);
    removeButton.addEventListener("click", () => removeItem(item.id));
    row.append(image, details, removeButton);
    fragment.append(row);
  }
  cartItems.append(fragment);
}

function getFormData() {
  const data = new FormData(orderForm);
  return {
    customerName: String(data.get("customerName") || "").trim(),
    email: String(data.get("email") || "").trim(),
    phone: String(data.get("phone") || "").trim(),
    note: String(data.get("note") || "").trim(),
  };
}

function validateForm(data) {
  const errors = {};
  const phoneDigits = data.phone.replace(/\D/g, "");

  if (data.customerName.length < 2) {
    errors.customerName = "Вкажіть ім’я щонайменше з двох символів.";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.email = "Введіть коректну електронну адресу.";
  }
  if (!/^\+?[\d\s().-]+$/.test(data.phone) || phoneDigits.length < 10 || phoneDigits.length > 15) {
    errors.phone = "Введіть номер із 10–15 цифр; можна використовувати +, пробіли та дужки.";
  }
  if (data.note.length > 300) {
    errors.note = "Побажання не може перевищувати 300 символів.";
  }

  return errors;
}

function clearFormErrors() {
  formStatus.textContent = "";
  for (const { input, error } of Object.values(formFields)) {
    input.removeAttribute("aria-invalid");
    error.textContent = "";
  }
}

function showFormErrors(errors) {
  clearFormErrors();
  for (const [name, message] of Object.entries(errors)) {
    const field = formFields[name];
    field.input.setAttribute("aria-invalid", "true");
    field.error.textContent = message;
  }

  const firstInvalidField = Object.keys(errors)[0];
  if (firstInvalidField) {
    formStatus.textContent = "Перевірте, будь ласка, поля, позначені нижче.";
    formFields[firstInvalidField].input.focus();
  }
}

function showSuccess(data, items, total) {
  clearFormErrors();
  successMessage.textContent = `Дякуємо, ${data.customerName}! Ваше замовлення підготовлено. Це демонстрація — дані нікуди не надсилаються.`;

  orderSummary.replaceChildren();
  const list = document.createElement("ul");
  for (const item of items) {
    const entry = document.createElement("li");
    entry.textContent = `${item.title} — ${formatPrice(item.price)}`;
    list.append(entry);
  }

  const summaryName = document.createElement("p");
  summaryName.textContent = `Ім’я: ${data.customerName}`;
  const summaryEmail = document.createElement("p");
  summaryEmail.textContent = `Email: ${data.email}`;
  const summaryPhone = document.createElement("p");
  summaryPhone.textContent = `Телефон: ${data.phone}`;
  orderSummary.append(summaryName, summaryEmail, summaryPhone, list);

  if (data.note) {
    const summaryNote = document.createElement("p");
    summaryNote.textContent = `Побажання: ${data.note}`;
    orderSummary.append(summaryNote);
  }

  const summaryTotal = document.createElement("p");
  summaryTotal.textContent = `Усього: ${items.length} ${getItemCountLabel(items.length).replace(/^\d+\s*/, "")} · ${formatPrice(total)}`;
  orderSummary.append(summaryTotal);

  selectedItems = [];
  orderForm.reset();
  renderCart();
  applyCatalogFilters();
  checkoutLayout.hidden = true;
  successPanel.hidden = false;
  successPanel.focus();
}

orderForm.addEventListener("submit", (event) => {
  event.preventDefault();
  clearFormErrors();

  if (selectedItems.length === 0) {
    formStatus.textContent = "Спочатку додайте хоча б один товар до кошика.";
    return;
  }

  const currentIds = new Set(allItems.map((item) => item.id));
  if (selectedItems.some((item) => !currentIds.has(item.id))) {
    formStatus.textContent = "Один із вибраних товарів більше недоступний. Оновіть каталог і перевірте кошик.";
    return;
  }

  const data = getFormData();
  const errors = validateForm(data);
  if (Object.keys(errors).length > 0) {
    showFormErrors(errors);
    return;
  }

  const items = [...selectedItems];
  const total = items.reduce((sum, item) => sum + item.price, 0);
  showSuccess(data, items, total);
});

newOrderButton.addEventListener("click", () => {
  successPanel.hidden = true;
  checkoutLayout.hidden = false;
  clearFormErrors();
  document.querySelector("#cart-title").focus();
});

searchInput.addEventListener("input", applyCatalogFilters);
categoryFilter.addEventListener("change", applyCatalogFilters);
sortOrder.addEventListener("change", applyCatalogFilters);

loadItems();
