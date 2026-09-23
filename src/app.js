import * as db from "./data.js";
import {
  orderText,
  telegramLink,
  telegramPostUrl,
  reconcileCart,
  MAX_IMAGES,
  DISCOUNTS,
  discountPercent,
  effectivePrice,
  csv,
  PURPOSES,
  BENEFITS,
  BUNDLES,
  bundleLabel,
} from "./core.js";

(() => {
  const root = document.getElementById("hugo-preview");
  const q = (s) => root.querySelector(s);
  const all = (s) => [...root.querySelectorAll(s)];
  const dict = {
    uk: {
      catalog: "Каталог",
      admin: "Адмінка",
      demo: "Інтерактивний макет · демотовари",
      search: "Яку техніку шукаєш?",
      selection: "Мій вибір",
      tagline: "Техніка під твої задачі",
      title: "Знайди свою техніку.",
      subtitle: "Обирай за бюджетом. Порівнюй характеристики.",
      ask: "Потрібна порада?",
      all: "Усі товари",
      categories: [
        "Ноутбуки",
        "Телефони",
        "Планшети",
        "Навушники",
        "Смартгодинники",
        "Монітори",
      ],
      filters: "Фільтри",
      price: "Ціна, zł",
      brand: "Бренд",
      cpu: "Процесор",
      ram: "Оперативна пам’ять",
      ssd: "Накопичувач",
      gpu: "Графіка",
      any: "Усі",
      reset: "Скинути фільтри",
      newest: "Спочатку нові",
      cheap: "Від дешевих",
      expensive: "Від дорогих",
      results: "товарів",
      photo: "Місце для твого фото",
      demoTag: "Демо",
      detail: "Детальніше",
      add: "Додати до вибору",
      added: "У твоєму списку",
      empty: "За цими фільтрами товарів немає.",
      back: "Назад до каталогу",
      spec: "Характеристики",
      condition: "Стан",
      stateValue: "Уточнюється",
      warranty: "Гарантія",
      unknown: "Буде вказано",
      screen: "Екран",
      description: "Опис",
      detailNote:
        "Приклад картки. Фото, стан, гарантію й актуальну наявність заповнимо перед запуском.",
      cartTitle: "Твій вибір",
      cartSub: "Один список — одне повідомлення.",
      total: "Разом",
      request: "Написати в Telegram",
      copy: "Скопіювати текст",
      copied: "Текст скопійовано.",
      copyFallback: "Виділи та скопіюй текст у полі вище.",
      cartNote:
        "Відкриється чат із підготовленим текстом. Натисни «Надіслати» у Telegram.",
      demoCart:
        "Це демотовари. Текст заявки доступний для перегляду; відправлення увімкнемо для актуального асортименту.",
      cartEmpty: "Твій список поки порожній.",
      continue: "Обрати товари",
      remove: "Прибрати",
      manage: "Керування товарами",
      manageSub: "Ціна, фото й наявність — в одному місці.",
      newProduct: "Додати товар",
      edit: "Редагувати",
      duplicate: "Дублювати",
      delete: "Видалити",
      confirmDelete: "Видалити цей демотовар?",
      statuses: ["У наявності", "Заброньовано", "Продано", "Чернетка"],
      adminNote:
        "Демо адмінки. Зміни діють лише в цьому макеті й зникнуть після перезавантаження. Захищений вхід через Supabase підключимо окремо.",
      save: "Зберегти",
      cancel: "Скасувати",
      name: "Назва товару",
      category: "Категорія",
      status: "Статус",
      photos: "Фото пристрою",
      photoHint: "До 5 фото, до 5 МБ кожне. Перше — головне.",
      descUk: "Опис українською",
      descPl: "Опис польською",
      model: "Модель / серія процесора",
      memory: "Пам’ять, ГБ",
      diagonal: "Діагональ, дюйми",
      type: "Тип / підключення",
      resolution: "Роздільність",
      hz: "Частота, Гц",
      saved: "Збережено в макеті.",
      min: "Від",
      max: "До",
      requestText: "Вітаю! Цікавлять ці товари:",
      demoRequest: "ДЕМО — НЕ ЗАМОВЛЕННЯ",
      battery: "Стан батареї",
      os: "Система",
      imageError: "Вибери до 5 зображень JPEG, PNG або WebP, до 5 МБ кожне.",
    },
    pl: {
      catalog: "Katalog",
      admin: "Panel admina",
      demo: "Interaktywny projekt · produkty demo",
      search: "Jakiego sprzętu szukasz?",
      selection: "Mój wybór",
      tagline: "Sprzęt do Twoich zadań",
      title: "Znajdź swój sprzęt.",
      subtitle: "Wybierz budżet. Porównaj parametry.",
      ask: "Potrzebujesz porady?",
      all: "Wszystkie",
      categories: [
        "Laptopy",
        "Telefony",
        "Tablety",
        "Słuchawki",
        "Smartwatche",
        "Monitory",
      ],
      filters: "Filtry",
      price: "Cena, zł",
      brand: "Marka",
      cpu: "Procesor",
      ram: "Pamięć RAM",
      ssd: "Dysk",
      gpu: "Grafika",
      any: "Wszystkie",
      reset: "Wyczyść filtry",
      newest: "Najnowsze",
      cheap: "Cena rosnąco",
      expensive: "Cena malejąco",
      results: "produktów",
      photo: "Miejsce na Twoje zdjęcie",
      demoTag: "Demo",
      detail: "Szczegóły",
      add: "Dodaj do wyboru",
      added: "Na Twojej liście",
      empty: "Brak produktów dla wybranych filtrów.",
      back: "Wróć do katalogu",
      spec: "Specyfikacja",
      condition: "Stan",
      stateValue: "Do uzupełnienia",
      warranty: "Gwarancja",
      unknown: "Do uzupełnienia",
      screen: "Ekran",
      description: "Opis",
      detailNote:
        "Przykładowa karta. Zdjęcia, stan, gwarancję i dostępność uzupełnimy przed uruchomieniem.",
      cartTitle: "Twój wybór",
      cartSub: "Jedna lista — jedna wiadomość.",
      total: "Razem",
      request: "Napisz w Telegramie",
      copy: "Kopiuj wiadomość",
      copied: "Wiadomość skopiowana.",
      copyFallback: "Zaznacz i skopiuj tekst z pola powyżej.",
      cartNote:
        "Otworzy się czat z gotowym tekstem. Naciśnij „Wyślij” w Telegramie.",
      demoCart:
        "To produkty demo. Możesz sprawdzić wiadomość; wysyłkę włączymy dla aktualnej oferty.",
      cartEmpty: "Twoja lista jest pusta.",
      continue: "Wybierz produkty",
      remove: "Usuń z listy",
      manage: "Zarządzanie produktami",
      manageSub: "Cena, zdjęcia i dostępność w jednym miejscu.",
      newProduct: "Dodaj produkt",
      edit: "Edytuj",
      duplicate: "Duplikuj",
      delete: "Usuń",
      confirmDelete: "Usunąć ten produkt demo?",
      statuses: ["Dostępny", "Zarezerwowany", "Sprzedany", "Szkic"],
      adminNote:
        "Panel demonstracyjny. Zmiany działają tylko w tym projekcie i znikną po odświeżeniu. Bezpieczne logowanie przez Supabase podłączymy osobno.",
      save: "Zapisz",
      cancel: "Anuluj",
      name: "Nazwa produktu",
      category: "Kategoria",
      status: "Status",
      photos: "Zdjęcia urządzenia",
      photoHint: "Do 5 zdjęć, maks. 5 MB każde. Pierwsze — główne.",
      descUk: "Opis po ukraińsku",
      descPl: "Opis po polsku",
      model: "Model / seria procesora",
      memory: "Pamięć, GB",
      diagonal: "Przekątna, cale",
      type: "Typ / łączność",
      resolution: "Rozdzielczość",
      hz: "Odświeżanie, Hz",
      saved: "Zapisano w projekcie.",
      min: "Od",
      max: "Do",
      requestText: "Dzień dobry! Interesują mnie te produkty:",
      demoRequest: "DEMO — NIE ZAMÓWIENIE",
      battery: "Stan baterii",
      os: "System",
      imageError: "Wybierz do 5 zdjęć JPEG, PNG lub WebP, maks. 5 MB każde.",
    },
  };
  const production = {
    uk: {
      demo: "",
      photo: "Фото ще не додано",
      demoTag: "",
      adminNote:
        "Товари та фото зберігаються в базі. Видалення товару незворотне; для проданих пристроїв використовуй статус «Продано».",
      detailNote: "Наявність і умови доставки підтверджуємо в Telegram.",
      demoCart: "Наявність підтвердимо після отримання повідомлення.",
      photoHint:
        "До 8 фото, до 10 МБ кожне. Знімки автоматично стискаються. Перше фото — головне.",
      imageError: "Вибери JPEG, PNG або WebP: до 8 фото, до 10 МБ кожне.",
      confirmDelete:
        "Видалити товар назавжди? Краще позначити проданим, якщо він потрібен в історії.",
      login: "Вхід адміністратора",
      email: "Електронна пошта",
      password: "Пароль",
      signin: "Увійти",
      signout: "Вийти",
      notAdmin: "Цей обліковий запис не має прав адміністратора.",
      error: "Не вдалося виконати дію. Перевір підключення та повтори.",
      authError: "Не вдалося увійти. Перевір email і пароль.",
      loading: "Завантаження каталогу…",
      unconfigured:
        "Каталог готується до відкриття. З питань товарів напиши @HUGO_Media.",
      loadError: "Не вдалося завантажити каталог.",
      retry: "Повторити",
      saved: "Збережено.",
      validation: "Перевір назву, бренд, ціну та характеристики.",
      share: "Скопіювати посилання",
      allStatus: "Усі статуси",
      empty: "Товарів за цими умовами поки немає.",
      newProduct: "Додати товар",
      mainPhoto: "Зробити головним",
      generation: "Покоління / серія",
      sim: "SIM / eSIM",
      gps: "GPS",
      lte: "LTE",
      compatibility: "Сумісність",
      noise: "Шумозаглушення",
      stale: "Список оновлено: деякі товари вже недоступні.",
      abandon: "Вийти з редагування? Незбережені зміни буде втрачено.",
    },
    pl: {
      demo: "",
      photo: "Zdjęcie wkrótce",
      demoTag: "",
      adminNote:
        "Produkty i zdjęcia są zapisywane w bazie. Usunięcie jest nieodwracalne; dla sprzedanych urządzeń używaj statusu „Sprzedany”.",
      detailNote: "Dostępność i dostawę potwierdzimy w Telegramie.",
      demoCart: "Dostępność potwierdzimy po otrzymaniu wiadomości.",
      photoHint:
        "Do 8 zdjęć, maks. 10 MB każde. Zdjęcia są kompresowane. Pierwsze zdjęcie — główne.",
      imageError: "Wybierz JPEG, PNG lub WebP: do 8 zdjęć, maks. 10 MB każde.",
      confirmDelete:
        "Usunąć produkt na stałe? Aby zachować historię, oznacz go jako sprzedany.",
      login: "Logowanie administratora",
      email: "Adres e-mail",
      password: "Hasło",
      signin: "Zaloguj się",
      signout: "Wyloguj się",
      notAdmin: "To konto nie ma uprawnień administratora.",
      error:
        "Nie udało się wykonać operacji. Sprawdź połączenie i spróbuj ponownie.",
      authError: "Nie udało się zalogować. Sprawdź e-mail i hasło.",
      loading: "Ładowanie katalogu…",
      unconfigured:
        "Przygotowujemy katalog. W sprawie sprzętu napisz do @HUGO_Media.",
      loadError: "Nie udało się załadować katalogu.",
      retry: "Spróbuj ponownie",
      saved: "Zapisano.",
      validation: "Sprawdź nazwę, markę, cenę i parametry.",
      share: "Kopiuj link",
      allStatus: "Wszystkie statusy",
      empty: "Brak produktów dla wybranych warunków.",
      newProduct: "Dodaj produkt",
      mainPhoto: "Ustaw jako główne",
      generation: "Generacja / seria",
      sim: "SIM / eSIM",
      gps: "GPS",
      lte: "LTE",
      compatibility: "Kompatybilność",
      noise: "Redukcja hałasu",
      stale: "Lista zaktualizowana: niektóre produkty są niedostępne.",
      abandon: "Opuścić edycję? Niezapisane zmiany zostaną utracone.",
    },
  };
  Object.assign(dict.uk, production.uk);
  Object.assign(dict.pl, production.pl);
  Object.assign(dict.uk, {
    backToAdmin: "← До адмінки",
    setPassword: "Задай пароль адміністратора",
    changePassword: "Змінити пароль адміністратора",
    newPassword: "Новий пароль",
    savePassword: "Зберегти пароль",
    passwordSaved: "Пароль збережено. Тепер можеш керувати товарами.",
    passwordHint: "Щонайменше 8 символів.",
  });
  Object.assign(dict.pl, {
    backToAdmin: "← Do panelu admina",
    setPassword: "Ustaw hasło administratora",
    changePassword: "Zmień hasło administratora",
    newPassword: "Nowe hasło",
    savePassword: "Zapisz hasło",
    passwordSaved: "Hasło zapisane. Możesz zarządzać produktami.",
    passwordHint: "Co najmniej 8 znaków.",
  });
  Object.assign(dict.uk, {
    basicInfo: "Основне",
    mediaInfo: "Фото й опис",
    catalogTrust: "Перевірена техніка · Доставка по Польщі та Європі",
    closeFilters: "Закрити фільтри",
  });
  Object.assign(dict.pl, {
    basicInfo: "Podstawowe",
    mediaInfo: "Zdjęcia i opis",
    catalogTrust: "Sprawdzony sprzęt · Dostawa w Polsce i Europie",
    closeFilters: "Zamknij filtry",
  });
  Object.assign(dict.uk, {
    homeTitle: "Техніка, яку перевірили.",
    homeSub:
      "Ноутбуки, телефони та гаджети з гарантією. Допоможемо підібрати модель під твої задачі й бюджет.",
    browseCatalog: "Перейти до каталогу",
    popularCategories: "Популярні категорії",
    latestProducts: "Нові надходження",
    viewAll: "Дивитися всі",
    checkedTech: "Перевірена техніка",
    checkedTechSub: "Перевіряємо пристрій перед продажем",
    warrantyBenefit: "Гарантія до 12 місяців",
    warrantyBenefitSub: "Умови гарантії вказані в картці товару",
    deliveryBenefit: "Доставка по Європі",
    deliveryBenefitSub: "InPost, DPD та інші служби доставки",
    telegramHelp: "Не знаєш, що обрати?",
    telegramHelpSub: "Напиши нам — підберемо техніку під твій бюджет.",
    writeTelegram: "Написати в Telegram",
    available: "доступно",
  });
  Object.assign(dict.pl, {
    homeTitle: "Sprawdzony sprzęt. Dobry wybór.",
    homeSub:
      "Laptopy, telefony i urządzenia z gwarancją. Pomożemy dobrać model do Twoich potrzeb i budżetu.",
    browseCatalog: "Przejdź do katalogu",
    popularCategories: "Popularne kategorie",
    latestProducts: "Nowości",
    viewAll: "Zobacz wszystkie",
    checkedTech: "Sprawdzony sprzęt",
    checkedTechSub: "Każde urządzenie sprawdzamy przed sprzedażą",
    warrantyBenefit: "Gwarancja do 12 miesięcy",
    warrantyBenefitSub: "Warunki gwarancji znajdziesz przy produkcie",
    deliveryBenefit: "Dostawa w Europie",
    deliveryBenefitSub: "InPost, DPD i inne firmy kurierskie",
    telegramHelp: "Nie wiesz, co wybrać?",
    telegramHelpSub: "Napisz do nas — dobierzemy sprzęt do Twojego budżetu.",
    writeTelegram: "Napisz w Telegramie",
    available: "dostępne",
  });
  Object.assign(dict.uk, {
    heroEyebrow: "Перевірена техніка з Європи",
    heroTitle: "Надійний ноутбук без переплати.",
    heroSub:
      "Живі фото, чесні характеристики та гарантія. Обирай сам або напиши — підберемо найкращий варіант під бюджет.",
    heroPick: "Рекомендуємо сьогодні",
    heroFrom: "від",
    heroView: "Дивитися модель",
    shopNow: "Обрати ноутбук",
    inStockNow: "У наявності зараз",
    bestChoice: "Бестселери",
    bestChoiceSub: "Моделі, які найчастіше обирають для роботи й навчання.",
    saleOffers: "Вигідні пропозиції",
    saleOffersSub: "Перевірена техніка зі знижкою — поки є в наявності.",
    newArrivalsSub: "Свіжі моделі, які щойно з’явилися в каталозі.",
    verifiedLabel: "Перевірено HUGO",
    realPhotos: "Реальні фото товару",
    cardDetails: "Переглянути",
    cardOrder: "Замовити",
    seeTelegram: "Живі фото й відео в Telegram",
  });
  Object.assign(dict.pl, {
    heroEyebrow: "Sprawdzony sprzęt z Europy",
    heroTitle: "Pewny laptop bez przepłacania.",
    heroSub:
      "Realne zdjęcia, uczciwa specyfikacja i gwarancja. Wybierz sam lub napisz — dobierzemy najlepszy model do budżetu.",
    heroPick: "Polecamy dzisiaj",
    heroFrom: "od",
    heroView: "Zobacz model",
    shopNow: "Wybierz laptop",
    inStockNow: "Dostępne teraz",
    bestChoice: "Bestsellery",
    bestChoiceSub: "Modele najczęściej wybierane do pracy i nauki.",
    saleOffers: "Najlepsze okazje",
    saleOffersSub: "Sprawdzony sprzęt z rabatem — do wyczerpania zapasów.",
    newArrivalsSub: "Świeże modele, które właśnie pojawiły się w katalogu.",
    verifiedLabel: "Sprawdzone przez HUGO",
    realPhotos: "Realne zdjęcia produktu",
    cardDetails: "Zobacz",
    cardOrder: "Zamów",
    seeTelegram: "Realne zdjęcia i filmy w Telegramie",
  });
  Object.assign(dict.uk, {
    productPhoto: "Фото конкретного пристрою",
    configuration: "Комплектація",
    buyPanelTitle: "Готовий до замовлення",
    buyPanelSub: "Напиши в Telegram — підтвердимо наявність, стан і доставку.",
    secureDeal: "Перевірений перед продажем",
    fastContact: "Швидка відповідь у Telegram",
    specTitle: "Повні характеристики",
    aboutDevice: "Про цей пристрій",
  });
  Object.assign(dict.pl, {
    productPhoto: "Zdjęcie konkretnego urządzenia",
    configuration: "Konfiguracja",
    buyPanelTitle: "Gotowy do zamówienia",
    buyPanelSub:
      "Napisz w Telegramie — potwierdzimy dostępność, stan i dostawę.",
    secureDeal: "Sprawdzony przed sprzedażą",
    fastContact: "Szybka odpowiedź w Telegramie",
    specTitle: "Pełna specyfikacja",
    aboutDevice: "O tym urządzeniu",
  });
  Object.assign(dict.uk, {
    newArrival: "Нове надходження",
    markNewArrival: "Позначити як нове надходження",
    bestseller: "Бестселер",
    markBestseller: "Позначити як бестселер",
    discount: "Знижка",
    noDiscount: "Без знижки",
    yes: "Так",
    no: "Ні",
    regularPrice: "Звичайна ціна",
  });
  Object.assign(dict.pl, {
    newArrival: "Nowość",
    markNewArrival: "Oznacz jako nowość",
    bestseller: "Bestseller",
    markBestseller: "Oznacz jako bestseller",
    discount: "Rabat",
    noDiscount: "Bez rabatu",
    yes: "Tak",
    no: "Nie",
    regularPrice: "Cena regularna",
  });
  Object.assign(dict.uk, {
    orderNow: "Замовити",
    telegramMedia: "Живий огляд у Telegram",
    telegramPost: "Посилання на допис у Telegram",
    telegramPostHint:
      "Можна вставити повне посилання або t.me/h_m_g_pl/123. Воно автоматично буде виправлене. Порожнє поле відкриває канал.",
  });
  Object.assign(dict.pl, {
    orderNow: "Zamów",
    telegramMedia: "Realna prezentacja w Telegramie",
    telegramPost: "Link do posta w Telegramie",
    telegramPostHint:
      "Możesz wkleić pełny link lub t.me/h_m_g_pl/123. Zostanie poprawiony automatycznie. Puste pole otworzy kanał.",
  });
  Object.assign(dict.uk, {
    analytics: "Статистика",
    productsTab: "Товари",
    analyticsTitle: "Статистика сайту",
    analyticsSub: "Відвідування та дії покупців без збору особистих даних.",
    views: "Перегляди",
    visitors: "Унікальні відвідувачі",
    productViews: "Перегляди товарів",
    telegramClicks: "Переходи в Telegram",
    channelClicks: "Кліки в Telegram-канал",
    contactClicks: "Кліки в особисті повідомлення",
    productTelegramClicks: "Переходи до оглядів товарів",
    funnelConversion: "Конверсія /start → канал",
    cartAdds: "Додавання у вибір",
    topProducts: "Найпопулярніші товари",
    trafficSources: "Джерела переходів",
    devices: "Пристрої",
    destinations: "Куди переходять",
    recentTransitions: "Останні переходи",
    anonymousVisitor: "Відвідувач",
    destChannel: "Telegram-канал",
    destCatalog: "Каталог",
    destContact: "Особистий Telegram",
    destProduct: "Огляд товару в Telegram",
    destOrder: "Замовлення товару",
    destCartOrder: "Замовлення вибраних товарів",
    destOther: "Інший перехід",
    directTraffic: "Прямі переходи",
    noAnalytics: "Даних за цей період ще немає.",
    day: "День",
    week: "Тиждень",
    month: "Місяць",
    chartClose: "Закрити графік",
    chartByHour: "Динаміка за годинами",
    chartByDay: "Динаміка за днями",
    chartTotal: "Значення за період",
    chartEmpty: "За цей період подій ще немає.",
    openChart: "Відкрити графік і пояснення",
    analyticsClickHint: "Натисни на показник, щоб побачити графік і пояснення.",
    recentTransitionsDesc:
      "Останні анонімні переходи: звідки прийшла людина, куди натиснула і який товар дивилася.",
    metricViewsDesc:
      "Скільки разів відкривали сторінки сайту. Одна людина може створити кілька переглядів.",
    metricVisitorsDesc:
      "Орієнтовна кількість різних браузерів або пристроїв. Відвідувач визначається анонімним ID, а не ім’ям.",
    metricProductViewsDesc:
      "Скільки разів відкривали окремі сторінки товарів. Показує реальний інтерес до асортименту.",
    metricChannelClicksDesc:
      "Натискання кнопок, що ведуть у Telegram-канал. Це переходи, а не гарантовані підписки.",
    metricContactClicksDesc:
      "Натискання кнопок для особистого повідомлення в Telegram. Це найсильніший сигнал наміру зв’язатися.",
    metricProductTelegramClicksDesc:
      "Переходи з карток товарів до живих фото, відео й оглядів у Telegram-каналі.",
    metricCatalogClicksDesc:
      "Переходи зі стартової сторінки /start до каталогу товарів.",
    metricFunnelConversionDesc:
      "Частка сесій, які відкрили /start і потім натиснули перехід у Telegram-канал. Це головний показник ефективності посилання з TikTok.",
    metricCartAddsDesc:
      "Скільки разів товари додавали до «Мого вибору». Показує намір порівняти або замовити.",
    metricCompareAddsDesc:
      "Скільки разів товари додавали до порівняння характеристик.",
    metricBundleAddsDesc:
      "Скільки разів обирали додаткові послуги або комплекти до товару.",
    metricDestinationsDesc:
      "Куди люди переходять із сайту: канал, особисті повідомлення, огляд або замовлення.",
    metricTopProductsDesc:
      "Товари з найбільшою кількістю відкриттів за вибраний період.",
    metricSourcesDesc:
      "Звідки прийшли відвідувачі. UTM-мітка має пріоритет, інакше використовується сайт-джерело або прямий перехід.",
    metricDevicesDesc:
      "Розподіл переглядів за типами пристроїв: телефони, планшети та комп’ютери.",
    desktop: "Комп’ютер",
    tablet: "Планшет",
    mobile: "Телефон",
  });
  Object.assign(dict.pl, {
    analytics: "Statystyki",
    productsTab: "Produkty",
    analyticsTitle: "Statystyki strony",
    analyticsSub:
      "Odwiedziny i działania klientów bez zbierania danych osobowych.",
    views: "Wyświetlenia",
    visitors: "Unikalni użytkownicy",
    productViews: "Wyświetlenia produktów",
    telegramClicks: "Przejścia do Telegrama",
    channelClicks: "Kliknięcia do kanału Telegram",
    contactClicks: "Kliknięcia do wiadomości prywatnej",
    productTelegramClicks: "Przejścia do prezentacji produktów",
    funnelConversion: "Konwersja /start → kanał",
    cartAdds: "Dodania do wyboru",
    topProducts: "Najpopularniejsze produkty",
    trafficSources: "Źródła wejść",
    devices: "Urządzenia",
    destinations: "Dokąd przechodzą",
    recentTransitions: "Ostatnie przejścia",
    anonymousVisitor: "Użytkownik",
    destChannel: "Kanał Telegram",
    destCatalog: "Katalog",
    destContact: "Prywatny Telegram",
    destProduct: "Prezentacja produktu w Telegramie",
    destOrder: "Zamówienie produktu",
    destCartOrder: "Zamówienie wybranych produktów",
    destOther: "Inne przejście",
    directTraffic: "Wejścia bezpośrednie",
    noAnalytics: "Brak danych za ten okres.",
    day: "Dzień",
    week: "Tydzień",
    month: "Miesiąc",
    chartClose: "Zamknij wykres",
    chartByHour: "Dynamika godzinowa",
    chartByDay: "Dynamika dzienna",
    chartTotal: "Wartość za okres",
    chartEmpty: "Brak zdarzeń w tym okresie.",
    openChart: "Otwórz wykres i objaśnienie",
    analyticsClickHint: "Kliknij wskaźnik, aby zobaczyć wykres i objaśnienie.",
    recentTransitionsDesc:
      "Ostatnie anonimowe przejścia: skąd przyszła osoba, gdzie kliknęła i jaki produkt oglądała.",
    metricViewsDesc:
      "Liczba otwarć stron serwisu. Jedna osoba może wygenerować kilka wyświetleń.",
    metricVisitorsDesc:
      "Szacunkowa liczba różnych przeglądarek lub urządzeń. Użytkownik jest rozpoznawany po anonimowym ID, nie po nazwisku.",
    metricProductViewsDesc:
      "Liczba otwarć stron poszczególnych produktów. Pokazuje rzeczywiste zainteresowanie ofertą.",
    metricChannelClicksDesc:
      "Kliknięcia prowadzące do kanału Telegram. Są to przejścia, a nie potwierdzone subskrypcje.",
    metricContactClicksDesc:
      "Kliknięcia rozpoczynające prywatną rozmowę w Telegramie. To mocny sygnał zamiaru kontaktu.",
    metricProductTelegramClicksDesc:
      "Przejścia z produktów do realnych zdjęć, filmów i prezentacji na kanale Telegram.",
    metricCatalogClicksDesc:
      "Przejścia ze strony startowej /start do katalogu produktów.",
    metricFunnelConversionDesc:
      "Odsetek sesji, które otworzyły /start, a następnie kliknęły kanał Telegram. To główny wskaźnik skuteczności linku z TikToka.",
    metricCartAddsDesc:
      "Liczba dodań produktów do „Mojego wyboru”. Pokazuje zamiar porównania lub zamówienia.",
    metricCompareAddsDesc: "Liczba dodań produktów do porównania parametrów.",
    metricBundleAddsDesc:
      "Liczba wyborów dodatkowych usług lub zestawów do produktu.",
    metricDestinationsDesc:
      "Dokąd przechodzą użytkownicy: kanał, wiadomość prywatna, prezentacja lub zamówienie.",
    metricTopProductsDesc:
      "Produkty z największą liczbą otwarć w wybranym okresie.",
    metricSourcesDesc:
      "Skąd przyszli użytkownicy. Najpierw uwzględniana jest etykieta UTM, następnie domena odsyłająca albo wejście bezpośrednie.",
    metricDevicesDesc:
      "Podział wyświetleń według urządzeń: telefony, tablety i komputery.",
    desktop: "Komputer",
    tablet: "Tablet",
    mobile: "Telefon",
  });
  Object.assign(dict.uk, {
    startEyebrow: "HUGO MEDIA · ТЕХНІКА З ГАРАНТІЄЮ",
    startTitle: "Усе важливе — в одному місці.",
    startSub:
      "У Telegram першими з’являються нові надходження, живі фото, відео та акції. Для всіх підписників каналу — безкоштовна доставка та спеціальні пропозиції.",
    joinChannel: "Підписатися на Telegram",
    joinChannelHint: "Безкоштовна доставка + спеціальні пропозиції",
    openCatalog: "Переглянути асортимент",
    openCatalogHint: "Ціни, фільтри та характеристики",
    needSelection: "Допомогти підібрати техніку",
    needSelectionHint: "Написати особисто",
    startTrust: "Підписникам каналу — доставка 0 zł · гарантія до 12 місяців",
    channelStrip: "Підпишись: безкоштовна доставка та спеціальні пропозиції",
    subscribe: "Підписатися",
    catalogClicks: "Переходи в каталог",
    channel: "Канал",
  });
  Object.assign(dict.pl, {
    startEyebrow: "HUGO MEDIA · SPRZĘT Z GWARANCJĄ",
    startTitle: "Wszystko, czego potrzebujesz — w jednym miejscu.",
    startSub:
      "W Telegramie najpierw pojawiają się nowości, realne zdjęcia, filmy i promocje. Dla wszystkich obserwujących kanał — darmowa dostawa i specjalne oferty.",
    joinChannel: "Dołącz do Telegrama",
    joinChannelHint: "Darmowa dostawa + specjalne oferty",
    openCatalog: "Zobacz aktualną ofertę",
    openCatalogHint: "Ceny, filtry i specyfikacje",
    needSelection: "Pomoc w wyborze sprzętu",
    needSelectionHint: "Napisz bezpośrednio",
    startTrust:
      "Dla obserwujących kanał — dostawa 0 zł · gwarancja do 12 miesięcy",
    channelStrip: "Dołącz: darmowa dostawa i specjalne oferty",
    subscribe: "Dołącz",
    catalogClicks: "Przejścia do katalogu",
    channel: "Kanał",
  });
  Object.assign(dict.uk, {
    reviewsTab: "Відгуки",
    reviewsTitle: "Відгуки покупців",
    reviewsSub: "Реальні відгуки підсилюють довіру до магазину.",
    addReview: "Додати відгук",
    customerName: "Ім’я покупця",
    reviewUk: "Відгук українською",
    reviewPl: "Відгук польською",
    rating: "Оцінка",
    published: "Опубліковано",
    reviewPhoto: "Скриншот або фото",
    deleteReview: "Видалити відгук?",
    customerReviews: "Що кажуть покупці",
    compare: "Порівняти",
    comparison: "Порівняння",
    compareNow: "Порівняти товари",
    compareLimit: "Можна порівняти до 3 товарів.",
    clearCompare: "Очистити",
    purpose: "Для яких задач",
    advantages: "Основні переваги",
    bundles: "Додатково до товару",
    quantity: "Кількість у наявності",
    onlyOne: "Залишився 1 екземпляр",
    unitsLeft: "шт. у наявності",
    purposeStudy: "Для навчання",
    purposeOffice: "Для офісу",
    purposeProgramming: "Для програмування",
    purposeEditing: "Для монтажу",
    purposeGaming: "Для ігор",
    purposeTravel: "Для роботи в дорозі",
    benefitTested: "Повністю перевірено",
    benefitMetal: "Металевий корпус",
    benefitBattery: "Хороша автономність",
    benefitKeyboard: "Підсвітка клавіатури",
    benefitTouch: "Сенсорний екран",
    benefitLight: "Легкий корпус",
    benefitGradeA: "Стан класу A",
    bundleMouse: "Мишка +45 zł",
    bundleOffice: "Встановлення Microsoft Office +200 zł",
    bundlePhotoshop: "Встановлення Adobe Photoshop +200 zł",
    bundleSoftware: "Інші програми — за запитом",
    bundleSetup: "Налаштування Windows +50 zł",
    bundleUpgrade: "Апгрейд RAM/SSD — узгодити",
    shareFor: "Посилання для соцмереж",
    shareFacebook: "Facebook",
    shareTikTok: "TikTok",
    shareInstagram: "Instagram",
    shareTelegram: "Telegram",
    linkCopied: "Посилання з міткою скопійовано.",
    conversion: "Конверсія в Telegram",
    compareAdds: "Додавання до порівняння",
    bundleAdds: "Вибір комплектів",
    similar: "Схожі товари",
    conditionShort: "Стан",
    warrantyShort: "Гарантія",
    orderSteps: "Як замовити",
    orderStepsSub: "Підтверджуємо наявність та деталі особисто перед відправленням.",
    orderStepOne: "Обери техніку",
    orderStepOneSub: "Порівняй характеристики й відкрий живі фото у Telegram.",
    orderStepTwo: "Напиши нам",
    orderStepTwoSub: "Кнопка замовлення підставить назву та ціну товару в повідомлення.",
    orderStepThree: "Узгодь доставку й оплату",
    orderStepThreeSub: "Уточнимо спосіб оплати, доставку та умови гарантії до підтвердження замовлення.",
    deliveryNote: "Підписникам Telegram-каналу — безкоштовна доставка та спеціальні пропозиції.",
    trustQuestion: "Питання про повернення або гарантію?",
    trustQuestionSub: "Напиши нам до замовлення — розкажемо умови для конкретного товару.",
    moreRam: "Більше RAM",
    strongerOption: "Потужніший варіант",
    lowerPrice: "Дешевше",
    underBudget: "До 1500 zł",
    productInterest: "Інтерес до товарів",
    productInterestDesc: "Перегляди, натискання «Замовити» та переходи до огляду в Telegram по кожній моделі. CTR — частка сеансів із переглядом, у яких натиснули «Замовити». Це не підтверджені продажі.",
    interestNoContact: "Без звернення",
    interestNoContactDesc: "Сеанси з переглядом моделі без натискання «Замовити» (не означає втрачений продаж).",
    sourceBreakdown: "Джерела переглядів",
    sourceOther: "Інші / прямі",
    productInterestDetail: "Перегляди товару та переходи до особистого повідомлення по днях/годинах. Кліки не означають підтверджені замовлення.",
    trustDetails: "Перед купівлею",
    trustWarranty: "Гарантія",
    trustWarrantyText: "Термін зазначено в картці товару. Деталі гарантійного обслуговування підтвердимо перед замовленням.",
    trustPayment: "Оплата",
    trustPaymentText: "Доступний спосіб оплати узгодимо в особистому повідомленні до підтвердження замовлення.",
    trustDelivery: "Доставка",
    trustDeliveryText: "Надсилаємо InPost або DPD. Умови та адресу погодимо перед відправленням.",
    trustInspection: "Перевірка",
    trustInspectionText: "Перевіряємо техніку перед відправленням. Живі фото й огляд шукай у Telegram-пості товару.",
    trustReturns: "Повернення й обмін",
    trustReturnsText: "Напиши нам перед купівлею — повідомимо чинні умови для конкретного товару.",
    purchasedModel: "Придбана модель",
    trackingLinks: "Посилання з мітками для соцмереж",
    trackingLinksHint: "Розмісти відповідне посилання в TikTok, Facebook і Telegram. Без мітки деякі вбудовані браузери не передають джерело переходу.",
    interestViews: "Перегляди",
    interestOrders: "Замовити",
    interestChannel: "Огляд у TG",
    interestRate: "CTR",
    noPhoto: "Фото додається",
  });
  Object.assign(dict.pl, {
    reviewsTab: "Opinie",
    reviewsTitle: "Opinie klientów",
    reviewsSub: "Prawdziwe opinie zwiększają zaufanie do sklepu.",
    addReview: "Dodaj opinię",
    customerName: "Imię klienta",
    reviewUk: "Opinia po ukraińsku",
    reviewPl: "Opinia po polsku",
    rating: "Ocena",
    published: "Opublikowana",
    reviewPhoto: "Zrzut ekranu lub zdjęcie",
    deleteReview: "Usunąć opinię?",
    customerReviews: "Co mówią klienci",
    compare: "Porównaj",
    comparison: "Porównanie",
    compareNow: "Porównaj produkty",
    compareLimit: "Możesz porównać maksymalnie 3 produkty.",
    clearCompare: "Wyczyść",
    purpose: "Do jakich zadań",
    advantages: "Najważniejsze zalety",
    bundles: "Dodatki do produktu",
    quantity: "Liczba dostępnych sztuk",
    onlyOne: "Została 1 sztuka",
    unitsLeft: "szt. dostępne",
    purposeStudy: "Do nauki",
    purposeOffice: "Do biura",
    purposeProgramming: "Do programowania",
    purposeEditing: "Do montażu",
    purposeGaming: "Do gier",
    purposeTravel: "Do pracy w podróży",
    benefitTested: "W pełni sprawdzony",
    benefitMetal: "Metalowa obudowa",
    benefitBattery: "Dobra bateria",
    benefitKeyboard: "Podświetlana klawiatura",
    benefitTouch: "Ekran dotykowy",
    benefitLight: "Lekka obudowa",
    benefitGradeA: "Stan klasy A",
    bundleMouse: "Mysz +45 zł",
    bundleOffice: "Instalacja Microsoft Office +200 zł",
    bundlePhotoshop: "Instalacja Adobe Photoshop +200 zł",
    bundleSoftware: "Inne programy — na zapytanie",
    bundleSetup: "Konfiguracja Windows +50 zł",
    bundleUpgrade: "Rozbudowa RAM/SSD — ustalić",
    shareFor: "Linki do social media",
    shareFacebook: "Facebook",
    shareTikTok: "TikTok",
    shareInstagram: "Instagram",
    shareTelegram: "Telegram",
    linkCopied: "Link z oznaczeniem został skopiowany.",
    conversion: "Konwersja do Telegrama",
    compareAdds: "Dodania do porównania",
    bundleAdds: "Wybrane dodatki",
    similar: "Podobne produkty",
    conditionShort: "Stan",
    warrantyShort: "Gwarancja",
    orderSteps: "Jak zamówić",
    orderStepsSub: "Przed wysyłką osobiście potwierdzamy dostępność i szczegóły.",
    orderStepOne: "Wybierz sprzęt",
    orderStepOneSub: "Porównaj parametry i zobacz zdjęcia w Telegramie.",
    orderStepTwo: "Napisz do nas",
    orderStepTwoSub: "Przycisk zamówienia doda model i cenę do wiadomości.",
    orderStepThree: "Ustal dostawę i płatność",
    orderStepThreeSub: "Przed potwierdzeniem ustalimy sposób płatności, dostawę i warunki gwarancji.",
    deliveryNote: "Obserwujący kanał Telegram otrzymują darmową dostawę i specjalne oferty.",
    trustQuestion: "Pytania o zwrot lub gwarancję?",
    trustQuestionSub: "Napisz przed zakupem — przedstawimy warunki dla konkretnego produktu.",
    moreRam: "Więcej RAM",
    strongerOption: "Mocniejszy wariant",
    lowerPrice: "Taniej",
    underBudget: "Do 1500 zł",
    productInterest: "Zainteresowanie produktami",
    productInterestDesc: "Wyświetlenia, kliknięcia „Zamów” i przejścia do prezentacji w Telegramie według modelu. CTR to udział sesji z wyświetleniem, w których kliknięto „Zamów”. Nie są to potwierdzone transakcje.",
    interestNoContact: "Bez kontaktu",
    interestNoContactDesc: "Sesje z widokiem modelu bez kliknięcia „Zamów” (nie oznacza utraconej sprzedaży).",
    sourceBreakdown: "Źródła wyświetleń",
    sourceOther: "Inne / bezpośrednie",
    productInterestDetail: "Wyświetlenia produktu i przejścia do prywatnej wiadomości według dni/godzin. Kliknięcia nie oznaczają potwierdzonych zamówień.",
    trustDetails: "Przed zakupem",
    trustWarranty: "Gwarancja",
    trustWarrantyText: "Okres podany jest przy produkcie. Szczegóły obsługi gwarancyjnej potwierdzimy przed zamówieniem.",
    trustPayment: "Płatność",
    trustPaymentText: "Dostępną metodę płatności ustalimy w prywatnej wiadomości przed potwierdzeniem zamówienia.",
    trustDelivery: "Dostawa",
    trustDeliveryText: "Wysyłamy przez InPost lub DPD. Warunki i adres ustalimy przed wysyłką.",
    trustInspection: "Sprawdzenie",
    trustInspectionText: "Sprawdzamy sprzęt przed wysyłką. Zdjęcia i prezentację znajdziesz w poście produktu na Telegramie.",
    trustReturns: "Zwroty i wymiany",
    trustReturnsText: "Napisz przed zakupem — przedstawimy aktualne warunki dla konkretnego produktu.",
    purchasedModel: "Kupiony model",
    trackingLinks: "Linki z oznaczeniem źródła",
    trackingLinksHint: "Umieść odpowiedni link na TikToku, Facebooku i Telegramie. Bez oznaczenia niektóre przeglądarki aplikacji nie przekazują źródła ruchu.",
    interestViews: "Wyświetlenia",
    interestOrders: "Zamów",
    interestChannel: "Pokaz w TG",
    interestRate: "CTR",
    noPhoto: "Zdjęcie wkrótce",
  });
  Object.assign(dict.uk, {
    privacySettings: "Налаштування аналітики",
    privacyTitle: "Аналітика сайту",
    privacyDescription: "З вашого дозволу ми зберігаємо випадковий ідентифікатор у браузері та передаємо до Supabase перегляди товарів, кліки, джерело переходу й тип пристрою. Це допомагає покращувати каталог. Без згоди сайт і вибрані товари працюють як завжди. Згоду можна змінити будь-коли внизу сторінки.",
    privacyAccept: "Дозволити аналітику",
    privacyDecline: "Без аналітики",
  });
  Object.assign(dict.pl, {
    privacySettings: "Ustawienia analityki",
    privacyTitle: "Analityka strony",
    privacyDescription: "Za Twoją zgodą zapisujemy losowy identyfikator w przeglądarce i przesyłamy do Supabase odsłony produktów, kliknięcia, źródło wizyty i typ urządzenia. Pomaga nam to ulepszać katalog. Bez zgody strona i lista wybranych produktów działają normalnie. Zgodę można zmienić w dowolnym momencie w stopce.",
    privacyAccept: "Zezwól na analitykę",
    privacyDecline: "Bez analityki",
  });
  Object.assign(dict.uk, {
    charger: "Комплектація зарядки",
    chargerUnknown: "Не вказано",
    chargerAdapter: "Зарядний пристрій із блоком живлення",
    chargerCable: "Лише кабель, без блока живлення",
    chargerNone: "Без зарядного пристрою та кабелю",
  });
  Object.assign(dict.pl, {
    charger: "Zestaw do ładowania",
    chargerUnknown: "Nie podano",
    chargerAdapter: "Ładowarka z zasilaczem",
    chargerCable: "Tylko kabel, bez zasilacza",
    chargerNone: "Bez ładowarki i kabla",
  });
  function readLocal(k, f) {
    try {
      return JSON.parse(localStorage.getItem(k)) ?? f;
    } catch {
      return f;
    }
  }
  function writeLocal(k, v) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch {}
  }
  function pictureUrl(p) {
    return typeof p === "string" ? db.photoUrl(p) : p.url;
  }
  function notify(message) {
    q("#hp-notice").textContent = message;
  }
  function clearPictures() {
    formImages.forEach((p) => {
      if (typeof p !== "string") URL.revokeObjectURL(p.url);
    });
    formImages = [];
  }
  async function refresh() {
    [products, reviews] = await Promise.all([
      db.listProducts(),
      db.listReviews(),
    ]);
    cart = reconcileCart(cart, products);
    writeLocal("hmg-cart", cart);
    compare = compare.filter((id) =>
      products.some((p) => p.id === id && p.status === 0),
    );
    writeLocal("hmg-compare", compare);
  }
  async function run(fn) {
    if (busy) return;
    busy = true;
    root.setAttribute("aria-busy", "true");
    try {
      await fn();
    } catch (error) {
      notify(
        t(
          error.message === "notAdmin"
            ? "notAdmin"
            : error.message === "validation"
              ? "validation"
              : error.message === "imageError"
                ? "imageError"
                : "error",
        ),
      );
    } finally {
      busy = false;
      root.removeAttribute("aria-busy");
    }
  }
  function analyticsId(storage, key) {
    try {
      let value = storage.getItem(key);
      if (!value) {
        value = crypto.randomUUID();
        storage.setItem(key, value);
      }
      return value;
    } catch {
      return crypto.randomUUID();
    }
  }
  const consentKey = "hmg-analytics-consent";
  let analyticsConsent = null;
  try {
    const choice = localStorage.getItem(consentKey);
    if (choice === "yes" || choice === "no") analyticsConsent = choice === "yes";
  } catch {}
  if (analyticsConsent !== true) {
    try {
      localStorage.removeItem("hmg-visitor-id");
      sessionStorage.removeItem("hmg-session-id");
    } catch {}
  }
  let consentOpen = analyticsConsent === null;
  function setAnalyticsConsent(allowed) {
    const wasAllowed = analyticsConsent === true;
    analyticsConsent = allowed;
    consentOpen = false;
    try {
      localStorage.setItem(consentKey, allowed ? "yes" : "no");
      if (!allowed) {
        localStorage.removeItem("hmg-visitor-id");
        sessionStorage.removeItem("hmg-session-id");
      }
    } catch {}
    renderConsent();
    if (allowed && !wasAllowed) {
      recordEvent("page_view");
      if (view === "detail") recordEvent("product_view", selected);
    }
  }
  function renderConsent() {
    let panel = q("#hp-privacy-panel");
    if (!panel) {
      panel = document.createElement("aside");
      panel.id = "hp-privacy-panel";
      panel.className = "hp-privacy-panel";
      root.append(panel);
    }
    let settings = q("#hp-privacy-settings");
    if (!settings) {
      settings = document.createElement("button");
      settings.type = "button";
      settings.id = "hp-privacy-settings";
      q(".hp-bottom").append(settings);
    }
    settings.textContent = t("privacySettings");
    panel.hidden = !consentOpen || admin;
    panel.innerHTML = panel.hidden ? "" : `<div><strong>${t("privacyTitle")}</strong><p>${t("privacyDescription")}</p></div><div class="hp-privacy-actions"><button type="button" class="hp-button" id="hp-privacy-decline">${t("privacyDecline")}</button><button type="button" class="hp-button hp-primary" id="hp-privacy-accept">${t("privacyAccept")}</button></div>`;
  }
  let entryReferrer = "",
    trafficSource =
      new URLSearchParams(location.search).get("utm_source")?.slice(0, 80) ||
      "";
  try {
    const ref = document.referrer ? new URL(document.referrer) : null;
    if (ref && ref.origin !== location.origin) {
      entryReferrer = ref.hostname.slice(0, 255);
      if (!trafficSource) trafficSource = entryReferrer;
    }
  } catch {}
  if (!trafficSource) trafficSource = "direct";
  function deviceType() {
    const width = Math.min(screen.width, window.innerWidth);
    return width < 700 ? "mobile" : width < 1024 ? "tablet" : "desktop";
  }
  function recordEvent(event_type, product_id = null, destination = "") {
    if (admin || !db.ready || analyticsConsent !== true) return Promise.resolve();
    return db.trackEvent({
      visitor_id: analyticsId(localStorage, "hmg-visitor-id"),
      session_id: analyticsId(sessionStorage, "hmg-session-id"),
      event_type,
      product_id,
      path: (location.pathname + location.search).slice(0, 256),
      referrer_host: entryReferrer,
      traffic_source: trafficSource,
      device_type: deviceType(),
      language: lang,
      destination: String(destination || "").slice(0, 80),
    }).catch(() => {});
  }
  function recordBeforeNavigation(event_type, product_id, destination) {
    return Promise.race([
      recordEvent(event_type, product_id, destination),
      new Promise((resolve) => setTimeout(resolve, 600)),
    ]);
  }
  async function loadAnalytics() {
    statsLoading = true;
    statsError = false;
    render();
    try {
      analyticsEvents = await db.listAnalytics(statsRange);
    } catch {
      statsError = true;
    } finally {
      statsLoading = false;
      render();
    }
  }
  async function loadAudit() {
    if (!owner) return;
    auditLoading = true;
    auditError = false;
    render();
    try {
      auditRows = await db.listAudit();
    } catch {
      auditError = true;
    } finally {
      auditLoading = false;
      render();
    }
  }
  function adminNav(active) {
    return `<div class="hp-admin-tabs"><button type="button" class="hp-button ${active === "admin" ? "hp-primary" : ""}" data-view="admin">${icon("package")}${t("productsTab")}</button><button type="button" class="hp-button ${active === "reviews" ? "hp-primary" : ""}" data-view="reviews">${icon("star")}${t("reviewsTab")}</button><button type="button" class="hp-button ${active === "stats" ? "hp-primary" : ""}" data-view="stats">${icon("bar-chart-3")}${t("analytics")}</button>${owner ? `<button type="button" class="hp-button ${active === "activity" ? "hp-primary" : ""}" data-view="activity">${icon("history")}${t("activity")}</button>` : ""}</div>`;
  }
  function renderAudit() {
    const content = q("#hp-content");
    const labels = { name: t("name"), brand: t("brand"), cat: t("category"), status: t("status"), price: t("price"), condition: t("condition"), warranty: t("warranty"), images: t("activityPhotos"), specs: t("activityOther"), text_uk: t("reviewUk"), text_pl: t("reviewPl"), customer_name: t("customerName"), purchased_model: t("purchasedModel"), rating: t("rating"), is_published: t("published") };
    const stringify = (value, key) => {
      if (key === "images") return String((value || []).length);
      const raw = typeof value === "object" ? JSON.stringify(value || {}) : String(value ?? "—");
      return esc(raw.length > 160 ? `${raw.slice(0, 157)}…` : raw);
    };
    content.innerHTML = `${adminNav("activity")}<div class="hp-intro"><div><h1>${t("activity")}</h1><span class="hp-muted">${t("activitySub")}</span></div></div>${auditLoading ? `<p>${t("loading")}</p>` : auditError ? `<p role="alert">${t("activityError")}</p>` : auditRows.length ? `<div class="hp-audit-list">${auditRows.map((row) => {
      const before = row.before_data || {};
      const after = row.after_data || {};
      const name = after.name || before.name || after.customer_name || before.customer_name || `#${row.entity_id}`;
      const changes = Object.keys({ ...before, ...after }).filter((key) => !["created_at", "updated_at", "id"].includes(key) && JSON.stringify(before[key]) !== JSON.stringify(after[key]));
      return `<article class="hp-audit-item"><div class="hp-audit-heading"><strong>${t(row.action === "INSERT" ? "activityNew" : row.action === "DELETE" ? "activityDelete" : "activityUpdate")} · ${t(row.entity === "product" ? "activityProduct" : "activityReview")}: ${esc(name)}</strong><time datetime="${esc(row.created_at)}">${esc(new Intl.DateTimeFormat(lang === "uk" ? "uk-UA" : "pl-PL", { dateStyle: "medium", timeStyle: "short" }).format(new Date(row.created_at)))}</time></div><div class="hp-muted hp-small">${esc(row.actor_email || t("activitySystem"))} · #${row.entity_id}</div>${changes.length ? `<details><summary>${changes.map((key) => esc(labels[key] || key)).join(" · ")}</summary><div class="hp-audit-diff">${changes.map((key) => `<div><b>${esc(labels[key] || key)}</b><span>${t("activityOld")}: ${stringify(before[key], key)}</span><span>${t("activityNow")}: ${stringify(after[key], key)}</span></div>`).join("")}</div></details>` : ""}</article>`;
    }).join("")}</div>` : `<p class="hp-empty">${t("activityEmpty")}</p>`}`;
  }
  function countBy(rows, key, filter = () => true) {
    const counts = new Map();
    rows.filter(filter).forEach((row) => {
      const value = row[key] || "";
      counts.set(value, (counts.get(value) || 0) + 1);
    });
    return [...counts].sort((a, b) => b[1] - a[1]);
  }
  function renderAnalytics() {
    const events = analyticsEvents,
      pageViews = events.filter((e) => e.event_type === "page_view"),
      unique = new Set(pageViews.map((e) => e.visitor_id)).size,
      productViews = events.filter((e) => e.event_type === "product_view"),
      telegram = events.filter((e) => e.event_type === "telegram_click"),
      catalogClicks = events.filter((e) => e.event_type === "catalog_click"),
      channelClicks = telegram.filter(
        (e) => e.destination === "telegram_channel",
      ),
      contactClicks = telegram.filter(
        (e) => e.destination === "telegram_contact",
      ),
      productTelegramClicks = telegram.filter(
        (e) => e.destination === "telegram_product",
      ),
      cartEvents = events.filter((e) => e.event_type === "cart_add"),
      compareEvents = events.filter((e) => e.event_type === "compare_add"),
      bundleEvents = events.filter((e) => e.event_type === "bundle_select");
    const top = countBy(productViews, "product_id").slice(0, 8),
      sources = countBy(pageViews, "traffic_source").slice(0, 8),
      devices = countBy(pageViews, "device_type"),
      startSessions = new Set(
        pageViews
          .filter((e) => e.path?.startsWith("/start"))
          .map((e) => e.session_id),
      ),
      channelSessions = new Set(channelClicks.map((e) => e.session_id)),
      convertedSessions = [...channelSessions].filter((id) =>
        startSessions.has(id),
      ).length,
      conversion = startSessions.size
        ? Math.round((convertedSessions / startSessions.size) * 100)
        : 0,
      transitions = [...telegram, ...catalogClicks].sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at),
      ),
      destinations = countBy(transitions, "destination");
    const sourceLabel = (value) => {
      const source = String(value || "").toLowerCase();
      if (source.includes("tiktok")) return "TikTok";
      if (source.includes("facebook") || source === "fb") return "Facebook";
      if (source.includes("telegram") || source.includes("t.me")) return "Telegram";
      return t("sourceOther");
    };
    const interest = [...new Set([...products.map((p) => p.id), ...productViews.map((event) => Number(event.product_id)), ...telegram.map((event) => Number(event.product_id))].filter(Boolean))]
      .map((id) => {
        const viewed = productViews.filter((event) => Number(event.product_id) === id),
          orderClicks = telegram.filter((event) => Number(event.product_id) === id && event.destination === "telegram_order"),
          media = telegram.filter((event) => Number(event.product_id) === id && event.destination === "telegram_product").length,
          sourceCounts = new Map();
        viewed.forEach((event) => {
          const label = sourceLabel(event.traffic_source);
          sourceCounts.set(label, (sourceCounts.get(label) || 0) + 1);
        });
        const viewSessions = new Set(viewed.map((event) => event.session_id).filter(Boolean));
        const orderSessions = new Set(orderClicks.map((event) => event.session_id).filter(Boolean));
        const converted = [...viewSessions].filter((session) => orderSessions.has(session)).length;
        return { id, views: viewed.length, orders: orderClicks.length, media, noContact: viewSessions.size - converted, sourceCounts, rate: viewSessions.size ? Math.round(converted / viewSessions.size * 100) : 0 };
      })
      .sort((a, b) => b.views - a.views)
      ;
    const destinationLabel = (value) =>
      ({
        telegram_channel: t("destChannel"),
        catalog: t("destCatalog"),
        telegram_contact: t("destContact"),
        telegram_product: t("destProduct"),
        telegram_order: t("destOrder"),
        telegram_cart_order: t("destCartOrder"),
      })[value] || t("destOther");
    const valueFor = (key, rows) => {
      const views = rows.filter((e) => e.event_type === "page_view"),
        telegramRows = rows.filter((e) => e.event_type === "telegram_click");
      if (key === "views") return views.length;
      if (key === "visitors")
        return new Set(views.map((e) => e.visitor_id)).size;
      if (key === "productViews")
        return rows.filter((e) => e.event_type === "product_view").length;
      if (key === "channelClicks")
        return telegramRows.filter((e) => e.destination === "telegram_channel")
          .length;
      if (key === "contactClicks")
        return telegramRows.filter((e) => e.destination === "telegram_contact")
          .length;
      if (key === "productTelegramClicks")
        return telegramRows.filter((e) => e.destination === "telegram_product")
          .length;
      if (key === "catalogClicks")
        return rows.filter((e) => e.event_type === "catalog_click").length;
      if (key === "cartAdds")
        return rows.filter((e) => e.event_type === "cart_add").length;
      if (key === "compareAdds")
        return rows.filter((e) => e.event_type === "compare_add").length;
      if (key === "bundleAdds")
        return rows.filter((e) => e.event_type === "bundle_select").length;
      if (key === "funnelConversion") {
        const starts = new Set(
            views
              .filter((e) => e.path?.startsWith("/start"))
              .map((e) => e.session_id),
          ),
          channels = new Set(
            telegramRows
              .filter((e) => e.destination === "telegram_channel")
              .map((e) => e.session_id),
          ),
          converted = [...channels].filter((id) => starts.has(id)).length;
        return starts.size ? Math.round((converted / starts.size) * 100) : 0;
      }
      return 0;
    };
    const metrics = [
      ["views", t("views"), pageViews.length, "metricViewsDesc"],
      ["visitors", t("visitors"), unique, "metricVisitorsDesc"],
      [
        "productViews",
        t("productViews"),
        productViews.length,
        "metricProductViewsDesc",
      ],
      [
        "channelClicks",
        t("channelClicks"),
        channelClicks.length,
        "metricChannelClicksDesc",
      ],
      [
        "contactClicks",
        t("contactClicks"),
        contactClicks.length,
        "metricContactClicksDesc",
      ],
      [
        "productTelegramClicks",
        t("productTelegramClicks"),
        productTelegramClicks.length,
        "metricProductTelegramClicksDesc",
      ],
      [
        "catalogClicks",
        t("catalogClicks"),
        catalogClicks.length,
        "metricCatalogClicksDesc",
      ],
      [
        "funnelConversion",
        t("funnelConversion"),
        conversion,
        "metricFunnelConversionDesc",
      ],
      ["cartAdds", t("cartAdds"), cartEvents.length, "metricCartAddsDesc"],
      [
        "compareAdds",
        t("compareAdds"),
        compareEvents.length,
        "metricCompareAddsDesc",
      ],
      [
        "bundleAdds",
        t("bundleAdds"),
        bundleEvents.length,
        "metricBundleAddsDesc",
      ],
    ];
    const metric = ([key, label, value]) =>
      `<button type="button" class="hp-stat-card" data-stat-metric="${key}" aria-label="${esc(label)} — ${esc(t("openChart"))}"><span>${esc(label)}</span><strong>${key === "funnelConversion" ? `${value}%` : money(value)}</strong><small>${icon("chart-no-axes-column-increasing")}${t("openChart")}</small></button>`;
    const list = (items, labeler) =>
      items.length
        ? items
            .map(
              ([key, value]) =>
                `<span class="hp-stat-row"><span>${esc(labeler(key))}</span><b>${money(value)}</b></span>`,
            )
            .join("")
        : `<p class="hp-muted hp-small">${t("noAnalytics")}</p>`;
    const journeys = transitions.length
      ? transitions
          .slice(0, 10)
          .map((event) => {
            const visitor = String(event.visitor_id || "").slice(0, 8),
              source = event.traffic_source || t("directTraffic"),
              product = event.product_id
                ? products.find((p) => p.id === Number(event.product_id))
                    ?.name || `HMG-${String(event.product_id).padStart(3, "0")}`
                : "",
              when = new Date(event.created_at).toLocaleString(
                lang === "uk" ? "uk-UA" : "pl-PL",
                {
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                },
              );
            return `<div class="hp-stat-row hp-stat-journey"><span><b>${esc(t("anonymousVisitor"))} ${esc(visitor)}</b><small>${esc(source)} → ${esc(destinationLabel(event.destination))}${product ? ` · ${esc(product)}` : ""}</small></span><time>${esc(when)}</time></div>`;
          })
          .join("")
      : `<p class="hp-muted hp-small">${t("noAnalytics")}</p>`;
    const buckets = () => {
      const hourly = statsRange === 1,
        count = hourly ? 24 : statsRange,
        points = [],
        pad = (value) => String(value).padStart(2, "0"),
        keyFor = (date) =>
          hourly
            ? `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${pad(date.getHours())}`
            : `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
      for (let index = count - 1; index >= 0; index -= 1) {
        const point = new Date();
        if (hourly) {
          point.setMinutes(0, 0, 0);
          point.setHours(point.getHours() - index);
        } else {
          point.setHours(0, 0, 0, 0);
          point.setDate(point.getDate() - index);
        }
        points.push({
          key: keyFor(point),
          label: hourly
            ? point.toLocaleTimeString(lang === "uk" ? "uk-UA" : "pl-PL", {
                hour: "2-digit",
                minute: "2-digit",
              })
            : point.toLocaleDateString(lang === "uk" ? "uk-UA" : "pl-PL", {
                day: "2-digit",
                month: "2-digit",
              }),
          rows: [],
        });
      }
      const byKey = new Map(points.map((point) => [point.key, point]));
      events.forEach((event) => {
        const date = new Date(event.created_at),
          point = byKey.get(keyFor(date));
        if (point) point.rows.push(event);
      });
      return points;
    };
    const breakdowns = {
      destinations: {
        label: t("destinations"),
        description: t("metricDestinationsDesc"),
        items: destinations.map(([key, value]) => [
          destinationLabel(key),
          value,
        ]),
      },
      topProducts: {
        label: t("topProducts"),
        description: t("metricTopProductsDesc"),
        items: top.map(([id, value]) => [
          products.find((p) => p.id === Number(id))?.name ||
            `HMG-${String(id).padStart(3, "0")}`,
          value,
        ]),
      },
      productInterest: {
        label: t("productInterest"),
        description: t("productInterestDesc"),
        items: interest.map(({ id, views }) => [products.find((p) => p.id === id)?.name || `HMG-${String(id).padStart(3, "0")}`, views]),
      },
      trafficSources: {
        label: t("trafficSources"),
        description: t("metricSourcesDesc"),
        items: sources.map(([key, value]) => [
          key || t("directTraffic"),
          value,
        ]),
      },
      devices: {
        label: t("devices"),
        description: t("metricDevicesDesc"),
        items: devices.map(([key, value]) => [t(key) || key, value]),
      },
    };
    const breakdownPanel = (key, content) =>
      `<button type="button" class="hp-stat-panel hp-stat-panel-action" data-stat-metric="${key}"><span class="hp-stat-panel-title">${esc(breakdowns[key].label)}${icon("arrow-up-right")}</span><span class="hp-stat-list">${content}</span></button>`;
    const chartModal = () => {
      if (!statsMetric) return "";
      if (statsMetric.startsWith("product:")) {
        const id = Number(statsMetric.slice(8)),
          item = interest.find((row) => row.id === id);
        if (!item) return "";
        const label = productTitle(products.find((p) => p.id === id) || { name: `HMG-${id}` }),
          points = buckets().map((point) => ({
            ...point,
            views: point.rows.filter((event) => event.event_type === "product_view" && Number(event.product_id) === id).length,
            orders: point.rows.filter((event) => event.event_type === "telegram_click" && event.destination === "telegram_order" && Number(event.product_id) === id).length,
          })),
          max = Math.max(1, ...points.map((point) => point.views));
        const graph = points.some((point) => point.views || point.orders)
          ? `<div class="hp-time-chart hp-interest-chart" style="--hp-chart-columns:${points.length}">${points.map((point) => `<div class="hp-chart-column" title="${esc(point.label)}: ${point.views} / ${point.orders}"><b>${point.views}</b><i><em style="height:${Math.max(point.views ? 5 : 0, Math.round(point.views / max * 100))}%"></em></i><span>${esc(point.label)}</span><small>${point.orders} ${t("interestOrders")}</small></div>`).join("")}</div>`
          : `<p class="hp-muted">${t("chartEmpty")}</p>`;
        const sourcesForProduct = [...item.sourceCounts].map(([source, count]) => `<span>${esc(source)}: <b>${count}</b></span>`).join(" · ");
        return `<div class="hp-stat-modal-backdrop"><section class="hp-stat-modal" role="dialog" aria-modal="true" aria-labelledby="hp-chart-title"><button type="button" class="hp-stat-modal-close" id="hp-stat-close" aria-label="${t("chartClose")}">${icon("x")}</button><div class="hp-kicker">${t("analytics")}</div><h2 id="hp-chart-title">${esc(label)}</h2><p>${t("productInterestDetail")}</p><div class="hp-chart-summary"><span>${t("interestViews")}: ${item.views} · ${t("interestOrders")}: ${item.orders} · ${t("interestRate")}: ${item.rate}%</span></div><h3>${statsRange === 1 ? t("chartByHour") : t("chartByDay")}</h3>${graph}<p class="hp-interest-sources"><b>${t("sourceBreakdown")}:</b> ${sourcesForProduct || t("noAnalytics")}</p></section></div>`;
      }
      const breakdown = breakdowns[statsMetric],
        metricConfig = metrics.find(([key]) => key === statsMetric);
      if (!breakdown && !metricConfig) return "";
      let label,
        description,
        value,
        graph,
        graphTitle = "";
      if (breakdown) {
        label = breakdown.label;
        description = breakdown.description;
        value = breakdown.items.reduce((sum, item) => sum + item[1], 0);
        const max = Math.max(1, ...breakdown.items.map((item) => item[1]));
        graph = breakdown.items.length
          ? `<div class="hp-breakdown-chart">${breakdown.items
              .map(
                ([name, amount]) =>
                  `<div><span title="${esc(name)}">${esc(name)}</span><i><em style="width:${Math.round((amount / max) * 100)}%"></em></i><b>${money(amount)}</b></div>`,
              )
              .join("")}</div>`
          : `<p class="hp-muted">${t("chartEmpty")}</p>`;
      } else {
        const [key, metricLabel, metricValue, descriptionKey] = metricConfig,
          points = buckets().map((point) => ({
            ...point,
            value: valueFor(key, point.rows),
          })),
          max = Math.max(1, ...points.map((point) => point.value)),
          suffix = key === "funnelConversion" ? "%" : "";
        label = metricLabel;
        description = t(descriptionKey);
        value = `${key === "funnelConversion" ? metricValue : money(metricValue)}${suffix}`;
        graphTitle = statsRange === 1 ? t("chartByHour") : t("chartByDay");
        graph = points.some((point) => point.value)
          ? `<div class="hp-time-chart" style="--hp-chart-columns:${points.length}">${points
              .map(
                (point) =>
                  `<div class="hp-chart-column" title="${esc(point.label)}: ${point.value}${suffix}"><b>${point.value}${suffix}</b><i><em style="height:${Math.max(point.value ? 5 : 0, Math.round((point.value / max) * 100))}%"></em></i><span>${esc(point.label)}</span></div>`,
              )
              .join("")}</div>`
          : `<p class="hp-muted">${t("chartEmpty")}</p>`;
      }
      return `<div class="hp-stat-modal-backdrop"><section class="hp-stat-modal" role="dialog" aria-modal="true" aria-labelledby="hp-chart-title"><button type="button" class="hp-stat-modal-close" id="hp-stat-close" aria-label="${t("chartClose")}">${icon("x")}</button><div class="hp-kicker">${t("analytics")}</div><h2 id="hp-chart-title">${esc(label)}</h2><p>${esc(description)}</p><div class="hp-chart-summary"><span>${t("chartTotal")}</span><strong>${value}</strong></div>${graphTitle ? `<h3>${graphTitle}</h3>` : ""}${graph}</section></div>`;
    };
    q("#hp-content").innerHTML =
      `${adminNav("stats")}<div class="hp-intro hp-stats-head"><div><h1>${t("analyticsTitle")}</h1><span class="hp-muted">${t("analyticsSub")}</span><small>${t("analyticsClickHint")}</small></div><div class="hp-range-tabs" role="group" aria-label="${t("analyticsTitle")}">${[
        [1, t("day")],
        [7, t("week")],
        [30, t("month")],
      ]
        .map(
          ([days, label]) =>
            `<button type="button" class="hp-button ${statsRange === days ? "hp-primary" : ""}" data-stats-range="${days}">${label}</button>`,
        )
        .join("")}</div></div>${
        statsLoading
          ? `<div class="hp-empty">${t("loading")}</div>`
          : statsError
            ? `<div class="hp-empty">${t("error")}</div>`
            : `<div class="hp-stat-grid">${metrics.map(metric).join("")}</div><div class="hp-stat-sections">${breakdownPanel("destinations", list(destinations, destinationLabel))}${breakdownPanel(
                "topProducts",
                list(
                  top,
                  (id) =>
                    products.find((p) => p.id === Number(id))?.name ||
                    `HMG-${String(id).padStart(3, "0")}`,
                ),
              )}${breakdownPanel(
                "trafficSources",
                list(sources, (source) => source || t("directTraffic")),
              )}${breakdownPanel(
                "devices",
                list(devices, (type) => t(type) || type),
              )}<section class="hp-stat-panel hp-stat-recent"><h3>${t("recentTransitions")}</h3><p class="hp-stat-panel-desc">${t("recentTransitionsDesc")}</p>${journeys}</section></div>${chartModal()}`
      }`;
    q(".hp-stats-head").insertAdjacentHTML("afterend", `<section class="hp-tracking-links"><strong>${t("trackingLinks")}</strong><p>${t("trackingLinksHint")}</p><div>${["tiktok", "facebook", "telegram"].map((source) => `<button type="button" class="hp-button" data-landing-social="${source}">${icon("copy")}${t("share" + source[0].toUpperCase() + source.slice(1))}</button>`).join("")}</div></section>`);
    if (!statsLoading && !statsError) q("#hp-content").insertAdjacentHTML("beforeend", `<section class="hp-interest"><button type="button" class="hp-interest-title" data-stat-metric="productInterest"><span><strong>${t("productInterest")}</strong><small>${t("productInterestDesc")}</small></span>${icon("chart-no-axes-column-increasing")}</button><div class="hp-interest-scroll"><table><thead><tr><th>${t("name")}</th><th>${t("interestViews")}</th><th>${t("interestOrders")}</th><th>${t("interestChannel")}</th><th title="${esc(t("interestNoContactDesc"))}">${t("interestNoContact")}</th><th>${t("interestRate")}</th><th>${t("sourceBreakdown")}</th></tr></thead><tbody>${interest.length ? interest.map(({ id, views, orders, media, noContact, rate, sourceCounts }) => `<tr><th><button type="button" class="hp-interest-product" data-stat-metric="product:${id}">${esc(productTitle(products.find((p) => p.id === id) || { name: `HMG-${id}` }))}${icon("chart-no-axes-column-increasing")}</button></th><td>${views}</td><td>${orders}</td><td>${media}</td><td>${noContact}</td><td>${rate}%</td><td>${[...sourceCounts].map(([source, count]) => `${esc(source)} ${count}`).join(" · ") || "—"}</td></tr>`).join("") : `<tr><td colspan="7">${t("noAnalytics")}</td></tr>`}</tbody></table></div></section>`);
    refreshIcons();
  }
  const icons = [
    "laptop",
    "smartphone",
    "tablet",
    "headphones",
    "watch",
    "monitor",
  ];
  const commonChoices = {
    condition: [
      "Новий / Nowy",
      "Як новий / Jak nowy",
      "Ідеальний / Idealny",
      "Дуже добрий / Bardzo dobry",
      "Добрий / Dobry",
      "Задовільний / Dostateczny",
    ],
    warranty: [
      "Без гарантії / Bez gwarancji",
      "1 місяць / 1 miesiąc",
      "3 місяці / 3 miesiące",
      "6 місяців / 6 miesięcy",
      "12 місяців / 12 miesięcy",
      "24 місяці / 24 miesiące",
    ],
  };
  const categoryChoices = [
    {
      brand: [
        "Acer",
        "Apple",
        "ASUS",
        "Dell",
        "Fujitsu",
        "HP",
        "Huawei",
        "Lenovo",
        "Microsoft",
        "MSI",
        "Razer",
        "Samsung",
      ],
      cpu: [
        "Intel Core i3",
        "Intel Core i5",
        "Intel Core i7",
        "Intel Core i9",
        "Intel Core Ultra 5",
        "Intel Core Ultra 7",
        "Intel Core Ultra 9",
        "Intel Celeron",
        "Intel Pentium",
        "Intel N-series",
        "AMD Ryzen 3",
        "AMD Ryzen 5",
        "AMD Ryzen 7",
        "AMD Ryzen 9",
        "Apple M1",
        "Apple M1 Pro",
        "Apple M1 Max",
        "Apple M2",
        "Apple M2 Pro",
        "Apple M2 Max",
        "Apple M3",
        "Apple M3 Pro",
        "Apple M3 Max",
        "Apple M4",
        "Apple M4 Pro",
        "Apple M4 Max",
      ],
      generation: [
        "Intel 4th Gen",
        "Intel 5th Gen",
        "Intel 6th Gen",
        "Intel 7th Gen",
        "Intel 8th Gen",
        "Intel 9th Gen",
        "Intel 10th Gen",
        "Intel 11th Gen",
        "Intel 12th Gen",
        "Intel 13th Gen",
        "Intel 14th Gen",
        "Intel Core Ultra Series 1",
        "Intel Core Ultra Series 2",
        "AMD Ryzen 3000",
        "AMD Ryzen 4000",
        "AMD Ryzen 5000",
        "AMD Ryzen 6000",
        "AMD Ryzen 7000",
        "AMD Ryzen 8000",
        "Apple M1",
        "Apple M2",
        "Apple M3",
        "Apple M4",
      ],
      ram: ["4", "8", "12", "16", "24", "32", "48", "64", "96", "128"],
      ssd: ["128", "256", "512", "1024", "2048", "4096"],
      gpu: [
        "Intel HD Graphics",
        "Intel UHD Graphics",
        "Intel Iris Plus",
        "Intel Iris Xe",
        "Intel Arc Graphics",
        "AMD Radeon Graphics",
        "AMD Radeon Vega",
        "NVIDIA GeForce MX250",
        "NVIDIA GeForce MX450",
        "NVIDIA GeForce GTX 1050",
        "NVIDIA GeForce GTX 1650",
        "NVIDIA GeForce GTX 1660 Ti",
        "NVIDIA GeForce RTX 2050",
        "NVIDIA GeForce RTX 2060",
        "NVIDIA GeForce RTX 2070",
        "NVIDIA GeForce RTX 2080",
        "NVIDIA GeForce RTX 3050",
        "NVIDIA GeForce RTX 3060",
        "NVIDIA GeForce RTX 3070",
        "NVIDIA GeForce RTX 3080",
        "NVIDIA GeForce RTX 4050",
        "NVIDIA GeForce RTX 4060",
        "NVIDIA GeForce RTX 4070",
        "NVIDIA GeForce RTX 4080",
        "NVIDIA GeForce RTX 4090",
        "NVIDIA Quadro M1000M",
        "NVIDIA Quadro M1200",
        "NVIDIA Quadro M2000M",
        "NVIDIA Quadro M2200",
        "NVIDIA Quadro P500",
        "NVIDIA Quadro P600",
        "NVIDIA Quadro P1000",
        "NVIDIA Quadro P2000",
        "NVIDIA Quadro P3000",
        "NVIDIA Quadro P4000",
        "NVIDIA Quadro P5000",
        "NVIDIA Quadro T500",
        "NVIDIA Quadro T600",
        "NVIDIA Quadro T1000",
        "NVIDIA Quadro T2000",
        "NVIDIA RTX A1000",
        "NVIDIA RTX A2000",
        "NVIDIA RTX A3000",
        "NVIDIA RTX A4000",
        "NVIDIA RTX A5000",
        "Apple integrated GPU",
      ],
      screen: [
        "11.6",
        "12.0",
        "12.3",
        "12.5",
        "13.0",
        "13.3",
        "13.5",
        "14.0",
        "14.5",
        "15.0",
        "15.6",
        "16.0",
        "16.1",
        "17.0",
        "17.3",
        "18.0",
      ],
    },
    {
      brand: [
        "Apple",
        "Samsung",
        "Google",
        "Xiaomi",
        "Redmi",
        "POCO",
        "OnePlus",
        "Motorola",
        "Huawei",
        "Honor",
        "OPPO",
        "Realme",
        "Nokia",
        "Sony",
        "ASUS",
        "Nothing",
        "Oukitel",
      ],
      cpu: [
        "Apple A13",
        "Apple A14",
        "Apple A15",
        "Apple A16",
        "Apple A17 Pro",
        "Apple A18",
        "Snapdragon 6 series",
        "Snapdragon 7 series",
        "Snapdragon 8 Gen 1",
        "Snapdragon 8 Gen 2",
        "Snapdragon 8 Gen 3",
        "Snapdragon 8 Elite",
        "Samsung Exynos",
        "MediaTek Helio",
        "MediaTek Dimensity",
        "Google Tensor",
      ],
      ram: ["2", "3", "4", "6", "8", "12", "16", "24"],
      ssd: ["32", "64", "128", "256", "512", "1024", "2048"],
      screen: [
        "4.7",
        "5.4",
        "5.8",
        "6.1",
        "6.2",
        "6.3",
        "6.4",
        "6.5",
        "6.6",
        "6.7",
        "6.8",
        "6.9",
        "7.6",
      ],
      os: ["Android", "iOS", "HarmonyOS"],
      sim: ["Nano-SIM", "Dual SIM", "eSIM", "Nano-SIM + eSIM", "Dual eSIM"],
      battery: ["Менше 80%", "80–84%", "85–89%", "90–94%", "95–99%", "100%"],
    },
    {
      brand: [
        "Apple",
        "Samsung",
        "Lenovo",
        "Microsoft",
        "Huawei",
        "Xiaomi",
        "Redmi",
        "Honor",
        "OPPO",
        "Realme",
        "Amazon",
        "TCL",
        "ASUS",
        "Acer",
      ],
      cpu: [
        "Apple M1",
        "Apple M2",
        "Apple M3",
        "Apple M4",
        "Apple A-series",
        "Snapdragon 6 series",
        "Snapdragon 7 series",
        "Snapdragon 8 series",
        "Samsung Exynos",
        "MediaTek Helio",
        "MediaTek Dimensity",
        "Intel Core i3",
        "Intel Core i5",
        "Intel Core i7",
      ],
      ram: ["2", "3", "4", "6", "8", "12", "16", "24", "32"],
      ssd: ["32", "64", "128", "256", "512", "1024", "2048"],
      screen: [
        "7.0",
        "8.0",
        "8.3",
        "9.0",
        "10.1",
        "10.2",
        "10.4",
        "10.9",
        "11.0",
        "12.4",
        "12.9",
        "13.0",
        "14.6",
      ],
      os: ["Android", "iPadOS", "Windows", "HarmonyOS", "Fire OS"],
      sim: [
        "Wi-Fi only",
        "Wi-Fi + Cellular",
        "Nano-SIM",
        "eSIM",
        "Nano-SIM + eSIM",
      ],
      battery: ["Менше 80%", "80–84%", "85–89%", "90–94%", "95–99%", "100%"],
    },
    {
      brand: [
        "Apple",
        "Samsung",
        "Sony",
        "JBL",
        "Bose",
        "Sennheiser",
        "Marshall",
        "Beats",
        "Huawei",
        "Xiaomi",
        "Redmi",
        "Anker Soundcore",
        "Logitech",
        "HyperX",
        "SteelSeries",
        "Razer",
      ],
      type: [
        "TWS",
        "Вкладиші / Douszne",
        "Внутрішньоканальні / Dokanałowe",
        "Накладні / Nauszne",
        "Повнорозмірні / Wokółuszne",
        "Дротові 3.5 mm",
        "USB-C",
        "Lightning",
        "Ігрова гарнітура / Gaming",
      ],
      noise: ["ANC", "Пасивне / Pasywne", "Без шумозаглушення / Brak"],
    },
    {
      brand: [
        "Apple",
        "Samsung",
        "Garmin",
        "Huawei",
        "Xiaomi",
        "Amazfit",
        "Google",
        "Fitbit",
        "Polar",
        "Suunto",
        "OnePlus",
        "Honor",
      ],
      compatibility: [
        "iPhone / iOS",
        "Android",
        "iOS + Android",
        "Samsung Galaxy",
      ],
      gps: ["Є / Tak", "Немає / Nie"],
      lte: ["Є / Tak", "Немає / Nie"],
    },
    {
      brand: [
        "Acer",
        "AOC",
        "Apple",
        "ASUS",
        "BenQ",
        "Dell",
        "Gigabyte",
        "HP",
        "Huawei",
        "Lenovo",
        "LG",
        "MSI",
        "Philips",
        "Samsung",
        "ViewSonic",
        "Xiaomi",
      ],
      screen: [
        "21.5",
        "22",
        "23.8",
        "24",
        "24.5",
        "25",
        "27",
        "28",
        "29",
        "31.5",
        "32",
        "34",
        "38",
        "40",
        "42",
        "43",
        "49",
      ],
      resolution: [
        "1920×1080 Full HD",
        "1920×1200 WUXGA",
        "2560×1080 UltraWide",
        "2560×1440 QHD",
        "3440×1440 UWQHD",
        "3840×2160 4K UHD",
        "5120×1440 Dual QHD",
        "5120×2160 5K2K",
        "5120×2880 5K",
      ],
      hz: ["60", "75", "100", "120", "144", "165", "180", "240", "360", "480"],
    },
  ];
  Object.assign(dict.uk, {
    activity: "Журнал змін", activitySub: "Хто, коли й що змінив у товарах і відгуках. Видно тільки власнику.",
    activityNew: "Додано", activityUpdate: "Змінено", activityDelete: "Видалено",
    activityProduct: "товар", activityReview: "відгук", activityEmpty: "Змін поки немає.",
    activityError: "Не вдалося завантажити журнал.", activitySystem: "Система",
    activityOld: "Було", activityNow: "Стало", activityPhotos: "Фото", activityOther: "Характеристики",
  });
  Object.assign(dict.pl, {
    activity: "Historia zmian", activitySub: "Kto, kiedy i co zmienił w produktach i opiniach. Widoczne tylko dla właściciela.",
    activityNew: "Dodano", activityUpdate: "Zmieniono", activityDelete: "Usunięto",
    activityProduct: "produkt", activityReview: "opinię", activityEmpty: "Brak zmian.",
    activityError: "Nie udało się pobrać historii.", activitySystem: "System",
    activityOld: "Było", activityNow: "Jest", activityPhotos: "Zdjęcia", activityOther: "Parametry",
  });
  const initialParams = new URLSearchParams(location.search),
    adminRoute = initialParams.get("admin"),
    startRoute = /^\/start\/?$/.test(location.pathname);
  let products = [],
    reviews = [];
  let lang = readLocal("hmg-language", "uk"),
    view =
      db.authCallback || adminRoute !== null
        ? adminRoute === "stats"
          ? "stats"
          : adminRoute === "reviews"
            ? "reviews"
            : adminRoute === "activity"
              ? "activity"
            : "admin"
        : initialParams.has("product")
          ? "detail"
          : startRoute
            ? "start"
            : "home",
    cat = -1,
    search = "",
    sort = "newest",
    filters = {},
    cart = readLocal("hmg-cart", []),
    compare = readLocal("hmg-compare", []),
    bundleSelections = readLocal("hmg-bundles", {}),
    selected = Number(initialParams.get("product")) || 1,
    editId = null,
    formImages = [],
    editReviewId = null,
    reviewImage = null,
    admin = false,
    owner = false,
    auditRows = [],
    auditLoading = false,
    auditError = false,
    busy = false,
    loading = true,
    loadError = false,
    passwordSetup = db.authCallback,
    analyticsEvents = [],
    statsRange = 7,
    statsMetric = "",
    statsLoading = false,
    statsError = false;
  if (!["uk", "pl"].includes(lang)) lang = "uk";
  if (!Array.isArray(cart)) cart = [];
  if (!Array.isArray(compare)) compare = [];
  if (!bundleSelections || typeof bundleSelections !== "object")
    bundleSelections = {};
  const t = (k) => dict[lang][k];
  const chargerLabel = (value) => ({
    adapter: t("chargerAdapter"),
    cable: t("chargerCable"),
    none: t("chargerNone"),
  })[value] || "";
  const esc = (x) =>
    String(x ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const money = (n) =>
    new Intl.NumberFormat(lang === "uk" ? "uk-UA" : "pl-PL").format(n);
  const icon = (n) =>
    typeof lucide !== "undefined"
      ? `<i data-lucide="${n}" aria-hidden="true"></i>`
      : `<span aria-hidden="true">${{ plus: "+", check: "✓", x: "×", "arrow-left": "←", "shopping-bag": "＋", pencil: "✎", copy: "⧉", "trash-2": "×", send: "↗", "message-circle": "↗", "sliders-horizontal": "≡" }[n] || "◇"}</span>`;
  const purposeKey = (k) => "purpose" + k[0].toUpperCase() + k.slice(1),
    benefitKey = (k) => "benefit" + k[0].toUpperCase() + k.slice(1),
    bundleKey = (k) => "bundle" + k[0].toUpperCase() + k.slice(1);
  function checkGroup(name, label, codes, selected, keyFn) {
    const chosen = csv(selected);
    return `<fieldset class="hp-field hp-wide hp-check-group"><legend>${label}</legend><div>${codes.map((code) => `<label><input type="checkbox" name="${name}" value="${code}" ${chosen.includes(code) ? "checked" : ""}><span>${t(keyFn(code))}</span></label>`).join("")}</div></fieldset>`;
  }
  function socialUrl(id, source) {
    const url = new URL(location.origin);
    url.searchParams.set("product", id);
    url.searchParams.set("utm_source", source);
    url.searchParams.set("utm_medium", "social");
    return url.toString();
  }
  function landingUrl(source) {
    const url = new URL(source === "tiktok" ? "/start" : "/", location.origin);
    url.searchParams.set("utm_source", source);
    url.searchParams.set("utm_medium", "social");
    return url.toString();
  }
  function bundleExtra(id) {
    return csv(bundleSelections[id]).reduce(
      (sum, key) => sum + (BUNDLES[key] || 0),
      0,
    );
  }
  function stockQty(p) {
    const value = Number(p.quantity);
    return Number.isFinite(value) && p.quantity !== "" ? value : 1;
  }
  function productTitle(p) {
    const title = String(p.name || "")
      .replace(
        /\s+(?:—\s*)?(?:Intel\s+Core|i[3579](?:-\d+gen)?|Apple\s+M[1-4]|M[1-4](?:\s+(?:Pro|Max))?)\b.*$/i,
        "",
      )
      .replace(/\s{2,}/g, " ")
      .trim();
    return title || p.name;
  }
  function localizedValue(value) {
    const parts = String(value || "").split(/\s*\/\s*/);
    return parts[lang === "pl" && parts.length > 1 ? 1 : 0] || "";
  }
  function productHighlights(p) {
    const highlights = [];
    if (p.condition) highlights.push(`${t("conditionShort")}: ${localizedValue(p.condition)}`);
    if (p.warranty) highlights.push(`${t("warrantyShort")}: ${localizedValue(p.warranty)}`);
    const benefits = csv(p.benefits);
    if (benefits.includes("touch")) highlights.push(t("benefitTouch"));
    if (benefits.includes("keyboard")) highlights.push(t("benefitKeyboard"));
    if (p.purposes) highlights.push(...csv(p.purposes).slice(0, 2).map((code) => t(purposeKey(code))));
    return highlights.filter(Boolean);
  }
  function cpuLevel(p) {
    const intel = String(p.cpu || "").match(/\bi([3579])\b/i),
      intelGeneration = String(p.generation || "").match(/\b(\d{1,2})(?:st|nd|rd|th)?\s*gen\b/i);
    if (intel && intelGeneration) return { family: `intel-${intelGeneration[1]}`, rank: Number(intel[1]) };
    const apple = String(p.cpu || "").match(/\bM([1-4])(?:\s+(Pro|Max|Ultra))?\b/i);
    if (apple) return { family: `apple-${apple[1]}`, rank: { pro: 2, max: 3, ultra: 4 }[apple[2]?.toLowerCase()] || 1 };
    return null;
  }
  function reviewsBlock(limit = 6) {
    const list = reviews.filter((r) => r.is_published).slice(0, limit);
    if (!list.length) return "";
    return `<section class="hp-home-section"><div class="hp-section-title"><h2>${t("customerReviews")}</h2></div><div class="hp-review-grid">${list.map((r) => `<article class="hp-review">${r.image_path ? `<a class="hp-review-image" href="${esc(db.photoUrl(r.image_path))}" target="_blank" rel="noopener noreferrer" aria-label="${esc(t("reviewPhoto"))}: ${esc(r.customer_name)}"><img src="${esc(db.photoUrl(r.image_path))}" alt="${esc(t("reviewPhoto"))}: ${esc(r.customer_name)}" loading="lazy"></a>` : ""}<div class="hp-stars" aria-label="${r.rating}/5">${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)}</div>${(lang === "uk" ? r.text_uk : r.text_pl) || r.text_uk || r.text_pl ? `<p>${esc((lang === "uk" ? r.text_uk : r.text_pl) || r.text_uk || r.text_pl)}</p>` : ""}<b>${esc(r.customer_name)}</b>${r.purchased_model ? `<small class="hp-review-model">${t("purchasedModel")}: ${esc(r.purchased_model)}</small>` : ""}</article>`).join("")}</div></section>`;
  }
  function renderCompareDock() {
    let dock = q("#hp-compare-dock");
    if (!dock) {
      dock = document.createElement("div");
      dock.id = "hp-compare-dock";
      root.append(dock);
    }
    const hidden = ["admin", "edit", "stats", "reviews", "reviewEdit"].includes(
      view,
    );
    dock.innerHTML =
      !hidden && compare.length
        ? `<span>${t("comparison")}: <b>${compare.length}/3</b></span><button type="button" class="hp-button hp-primary" data-view="compare">${t("compareNow")}</button><button type="button" class="hp-back" id="hp-clear-compare">${t("clearCompare")}</button>`
        : "";
    dock.className =
      !hidden && compare.length ? "hp-compare-dock hp-show" : "hp-compare-dock";
  }
  function renderReviewsAdmin() {
    q("#hp-content").innerHTML =
      `${adminNav("reviews")}<div class="hp-intro"><div><h1>${t("reviewsTitle")}</h1><span class="hp-muted">${t("reviewsSub")}</span></div><button type="button" class="hp-button hp-primary" id="hp-new-review">${icon("plus")}${t("addReview")}</button></div><div class="hp-admin-list">${reviews.length ? reviews.map((r) => `<div class="hp-admin-row hp-review-row"><div><b>${esc(r.customer_name)}</b><div class="hp-small hp-muted">${"★".repeat(r.rating)} · ${r.is_published ? t("published") : t("no")}${r.purchased_model ? ` · ${esc(r.purchased_model)}` : ""}</div></div><p>${esc((lang === "uk" ? r.text_uk : r.text_pl) || r.text_uk || r.text_pl)}</p><div class="hp-admin-actions"><button type="button" data-edit-review="${r.id}" aria-label="${t("edit")}">${icon("pencil")}</button><button type="button" data-delete-review="${r.id}" aria-label="${t("delete")}">${icon("trash-2")}</button></div></div>`).join("") : `<div class="hp-empty">${t("noAnalytics")}</div>`}</div>`;
    refreshIcons();
  }
  function renderReviewForm() {
    const r = reviews.find((x) => x.id === editReviewId) || {
      customer_name: "",
      purchased_model: "",
      text_uk: "",
      text_pl: "",
      rating: 5,
      is_published: true,
      image_path: "",
    };
    reviewImage = reviewImage ?? r.image_path;
    q("#hp-content").innerHTML =
      `<button type="button" class="hp-back" data-view="reviews">${icon("arrow-left")}${t("reviewsTab")}</button><form class="hp-form" id="hp-review-form"><h2>${editReviewId ? t("edit") : t("addReview")}</h2><div class="hp-form-grid">${field("customer_name", t("customerName"), r.customer_name, "text", true)}${field("purchased_model", t("purchasedModel"), r.purchased_model || "", "text")}<label class="hp-field">${t("rating")}<select name="rating">${[5, 4, 3, 2, 1].map((v) => option(v, `${v} ★`, r.rating)).join("")}</select></label><label class="hp-field">${t("published")}<select name="is_published">${option("true", t("yes"), String(r.is_published))}${option("false", t("no"), String(r.is_published))}</select></label><label class="hp-field hp-wide">${t("reviewPhoto")}<input type="file" id="hp-review-upload" accept="image/jpeg,image/png,image/webp"><div id="hp-review-preview">${reviewImage ? `<img src="${esc(pictureUrl(reviewImage))}" alt="${t("reviewPhoto")}"><button type="button" id="hp-remove-review-photo">${t("remove")}</button>` : ""}</div></label><label class="hp-field">${t("reviewUk")}<textarea name="text_uk" maxlength="1200">${esc(r.text_uk)}</textarea></label><label class="hp-field">${t("reviewPl")}<textarea name="text_pl" maxlength="1200">${esc(r.text_pl)}</textarea></label></div><div class="hp-form-actions"><button type="button" class="hp-button" data-view="reviews">${t("cancel")}</button><button type="submit" class="hp-button hp-primary">${t("save")}</button></div></form>`;
    refreshIcons();
  }
  function photo(p) {
    return `<div class="hp-photo">${p.images.length ? `<img src="${esc(pictureUrl(p.images[0]))}" alt="${esc(p.name)}">` : `${icon(icons[p.cat])}<span class="hp-small">${t("photo")}</span>`}</div>`;
  }
  function option(v, label, chosen) {
    return `<option value="${esc(v)}" ${String(v) === String(chosen) ? "selected" : ""}>${esc(label)}</option>`;
  }
  function selectFilter(key, label, values) {
    return `<label class="hp-field">${label}<select data-filter="${key}">${option("", t("any"), filters[key] || "")}${values.map((v) => option(v, v, filters[key])).join("")}</select></label>`;
  }
  function eligible() {
    return products.filter(
      (p) => p.status === 0 && stockQty(p) > 0 && (cat < 0 || p.cat === cat),
    );
  }
  function visible() {
    return eligible()
      .filter((p) =>
        [p.name, p.brand, p.cpu, p.gpu, p.ram, p.ssd]
          .join(" ")
          .toLowerCase()
          .includes(search.toLowerCase()),
      )
      .filter(
        (p) =>
          (!filters.min || effectivePrice(p) >= Number(filters.min)) &&
          (!filters.max || effectivePrice(p) <= Number(filters.max)) &&
          (!filters.purpose || csv(p.purposes).includes(filters.purpose)) &&
          ["brand", ...filterKeys(cat).map((x) => x[0])].every(
            (k) => !filters[k] || p[k] === filters[k],
          ),
      )
      .sort((a, b) =>
        sort === "cheap"
          ? effectivePrice(a) - effectivePrice(b)
          : sort === "expensive"
            ? effectivePrice(b) - effectivePrice(a)
            : b.id - a.id,
      );
  }
  function priceBlock(p, detail = false) {
    const discount = discountPercent(p);
    return `<div class="${detail ? "hp-detail-price" : "hp-price-stack"}">${discount ? `<span class="hp-old-price">${money(p.price)} zł</span>` : ""}<span class="${detail ? "hp-sale-price" : "hp-money"}">${money(effectivePrice(p))} <small>zł</small></span></div>`;
  }
  function productCard(p) {
    const discount = discountPercent(p),
      qty = stockQty(p),
      highlights = productHighlights(p);
    return `<article class="hp-product"><button class="hp-product-open" type="button" data-detail="${p.id}" aria-label="${t("detail")}: ${esc(p.name)}"><div class="hp-card-badges">${p.newArrival === "true" ? `<span class="hp-badge-new">${t("newArrival")}</span>` : ""}${p.bestseller === "true" ? `<span class="hp-badge-best">${t("bestseller")}</span>` : ""}${discount ? `<span class="hp-badge-sale">-${discount}%</span>` : ""}</div>${photo(p)}<div class="hp-product-body"><div class="hp-product-meta"><span>${esc(p.brand)}</span><span>${icon("badge-check")}${t("verifiedLabel")}</span></div><div class="hp-product-name">${esc(productTitle(p))}</div><div class="hp-specs"><span>${esc(p.cpu)}${p.ram ? ` · ${esc(p.ram)} GB RAM` : ""}</span><span>${p.ssd ? `${esc(p.ssd)} GB${p.cat === 0 ? " SSD" : ""}` : ""}${p.gpu ? ` · ${esc(p.gpu)}` : ""}</span></div>${highlights.length ? `<div class="hp-card-highlights">${highlights.map((label) => `<span>${esc(label)}</span>`).join("")}</div>` : ""}<div class="hp-card-stock ${qty === 1 ? "hp-card-stock-low" : ""}">${qty === 1 ? t("onlyOne") : `${qty} ${t("unitsLeft")}`}</div></div></button><div class="hp-product-foot"><div class="hp-price-row">${priceBlock(p)}<button type="button" class="hp-compare-add" data-compare="${p.id}" aria-label="${t("compare")}: ${esc(p.name)}" aria-pressed="${compare.includes(p.id)}">${icon(compare.includes(p.id) ? "check" : "columns-2")}</button></div><div class="hp-card-cta"><button type="button" class="hp-button hp-card-details" data-detail="${p.id}">${t("cardDetails")}</button><button type="button" class="hp-button hp-primary hp-card-order" data-order-one="${p.id}">${icon("send")}${t("cardOrder")}</button></div></div></article>`;
  }
  function cards() {
    const list = visible();
    q("#hp-results").textContent = `${list.length} ${t("results")}`;
    q("#hp-grid").innerHTML = list.length
      ? list.map(productCard).join("")
      : `<div class="hp-empty">${t("empty")}</div>`;
    refreshIcons();
  }
  function refreshIcons() {
    if (typeof lucide !== "undefined")
      lucide.createIcons({ attrs: { width: 17, height: 17 } });
  }
  function render() {
    document.documentElement.lang = lang;
    renderConsent();
    root.classList.toggle("hp-start-mode", view === "start");
    root.classList.toggle("hp-detail-mode", view === "detail");
    let adminReturn = q("#hp-admin-return");
    if (!adminReturn) {
      adminReturn = document.createElement("div");
      adminReturn.id = "hp-admin-return";
      adminReturn.className = "hp-admin-return";
      q("#hp-categories").after(adminReturn);
    }
    adminReturn.hidden = !admin || ["admin", "edit", "stats", "reviews", "reviewEdit", "activity", "start"].includes(view);
    adminReturn.innerHTML = adminReturn.hidden
      ? ""
      : `<button type="button" class="hp-button" data-view="admin">${t("backToAdmin")}</button>`;
    if (
      ["admin", "edit", "stats", "reviews", "reviewEdit", "activity"].includes(view) &&
      !admin
    ) {
      renderCompareDock();
      renderLogin();
      return;
    }
    q("#hp-search").placeholder = t("search");
    q("#hp-search").ariaLabel = t("search");
    q("#hp-order-label").textContent = t("selection");
    q("#hp-count").textContent = cart.length;
    q(".hp-mobile-telegram span").textContent = t("channel");
    q("#hp-footer-label").textContent = t("tagline");
    all("[data-lang]").forEach((b) =>
      b.setAttribute("aria-pressed", b.dataset.lang === lang),
    );
    q("#hp-categories").innerHTML = [
      { id: -1, label: t("all"), icon: "layout-grid" },
      ...t("categories").map((label, id) => ({ id, label, icon: icons[id] })),
    ]
      .map(
        (c) =>
          `<button type="button" class="hp-category" data-cat="${c.id}" aria-pressed="${cat === c.id}">${icon(c.icon)}${c.label}</button>`,
      )
      .join("");
    const content = q("#hp-content");
    if (
      (view === "catalog" || view === "home") &&
      (loading || !db.ready || loadError)
    ) {
      content.innerHTML = `<div class="hp-empty"><p>${t(loading ? "loading" : !db.ready ? "unconfigured" : "loadError")}</p>${loadError ? `<button class="hp-button" id="hp-retry">${t("retry")}</button>` : ""}</div>`;
      return;
    }
    if (view === "start") {
      content.innerHTML = `<section class="hp-start"><div class="hp-start-glow hp-start-glow-one"></div><div class="hp-start-glow hp-start-glow-two"></div><div class="hp-start-card"><div class="hp-start-mark">HUGO<span>MEDIA GROUP</span></div><div class="hp-kicker">${t("startEyebrow")}</div><h1>${t("startTitle")}</h1><p>${t("startSub")}</p><div class="hp-start-actions"><a class="hp-start-action hp-start-telegram" href="https://t.me/h_m_g_pl" target="_blank" rel="noopener noreferrer" data-track-target="telegram_channel"><span class="hp-start-icon">${icon("send")}</span><span><b>${t("joinChannel")}</b><small>${t("joinChannelHint")}</small></span>${icon("arrow-up-right")}</a><button type="button" class="hp-start-action" data-start-catalog><span class="hp-start-icon">${icon("layout-grid")}</span><span><b>${t("openCatalog")}</b><small>${t("openCatalogHint")}</small></span>${icon("arrow-right")}</button><a class="hp-start-action hp-start-personal" href="https://t.me/HUGO_Media" target="_blank" rel="noopener noreferrer" data-track-target="telegram_contact"><span class="hp-start-icon">${icon("message-circle")}</span><span><b>${t("needSelection")}</b><small>${t("needSelectionHint")}</small></span>${icon("arrow-up-right")}</a></div><div class="hp-start-trust">${icon("badge-check")}<span>${t("startTrust")}</span></div></div></section>`;
      refreshIcons();
    }
    if (view === "home") {
      const available = products.filter(
          (p) => p.status === 0 && stockQty(p) > 0,
        ),
        featured =
          [...available]
            .sort((a, b) => b.id - a.id)
            .find((p) => p.images.length && p.brand !== "Apple") ||
          available.find((p) => p.images.length) ||
          available[0],
        bestsellers = available
          .filter((p) => p.bestseller === "true")
          .slice(0, 4),
        featuredIds = new Set(bestsellers.map((p) => p.id)),
        offers = available
          .filter((p) => discountPercent(p) > 0 && !featuredIds.has(p.id))
          .sort((a, b) => discountPercent(b) - discountPercent(a))
          .slice(0, 4),
        displayedIds = new Set([...bestsellers, ...offers].map((p) => p.id)),
        latest = available
          .filter((p) => p.newArrival === "true" && !displayedIds.has(p.id))
          .sort((a, b) => b.id - a.id)
          .slice(0, 4);
      const productSection = (title, sub, list, kind = "") =>
        list.length
          ? `<section class="hp-home-section hp-merch-section ${kind}"><div class="hp-section-title"><div><div class="hp-kicker">Hugo selection</div><h2>${title}</h2>${sub ? `<p>${sub}</p>` : ""}</div><button type="button" class="hp-home-link" data-cat="-1">${t("viewAll")}${icon("arrow-right")}</button></div><div class="hp-grid hp-home-products">${list.map(productCard).join("")}</div></section>`
          : "";
      content.innerHTML = `<section class="hp-home-hero"><div class="hp-home-copy"><div class="hp-kicker">${t("heroEyebrow")}</div><h1>${t("heroTitle")}</h1><p>${t("heroSub")}</p><div class="hp-home-actions"><button type="button" class="hp-button hp-primary" data-cat="0">${t("shopNow")}${icon("arrow-right")}</button><a class="hp-button hp-hero-secondary" href="https://t.me/HUGO_Media" target="_blank" rel="noopener noreferrer" data-track-target="telegram_contact">${icon("message-circle")}${t("ask")}</a></div><div class="hp-hero-proof"><span>${icon("badge-check")}${t("verifiedLabel")}</span><span>${icon("camera")}${t("realPhotos")}</span></div></div>${featured ? `<div class="hp-featured"><div class="hp-featured-label">${t("heroPick")}</div><button type="button" class="hp-featured-product" data-detail="${featured.id}"><div class="hp-featured-image">${featured.images.length ? `<img src="${esc(pictureUrl(featured.images[0]))}" alt="${esc(featured.name)}">` : icon("laptop")}</div><div class="hp-featured-info"><span>${esc(featured.brand)}</span><strong>${esc(productTitle(featured))}</strong><small>${esc(featured.cpu)} · ${esc(featured.ram)} GB RAM · ${esc(featured.ssd)} GB SSD</small><div>${t("heroFrom")} <b>${money(effectivePrice(featured))} zł</b> ${icon("arrow-right")}</div></div></button></div>` : ""}</section><section class="hp-benefits"><div>${icon("badge-check")}<span><b>${t("checkedTech")}</b><small>${t("checkedTechSub")}</small></span></div><div>${icon("shield-check")}<span><b>${t("warrantyBenefit")}</b><small>${t("warrantyBenefitSub")}</small></span></div><div>${icon("truck")}<span><b>${t("deliveryBenefit")}</b><small>${t("deliveryBenefitSub")}</small></span></div><div class="hp-stock-benefit">${icon("package-check")}<span><b>${available.length} ${t("inStockNow")}</b><small>${t("realPhotos")}</small></span></div></section>${productSection(t("bestChoice"), t("bestChoiceSub"), bestsellers, "hp-bestsellers")}${productSection(t("saleOffers"), t("saleOffersSub"), offers, "hp-offers")}${productSection(t("latestProducts"), t("newArrivalsSub"), latest, "hp-latest")}${reviewsBlock()}<section class="hp-telegram-band"><div><div class="hp-kicker">Hugo concierge</div><h2>${t("telegramHelp")}</h2><p>${t("telegramHelpSub")}</p></div><a class="hp-button hp-primary" href="https://t.me/HUGO_Media" target="_blank" rel="noopener noreferrer" data-track-target="telegram_contact">${icon("send")}${t("writeTelegram")}</a></section>`;
      content.insertAdjacentHTML("beforeend", `<section class="hp-home-section hp-order-guide"><div class="hp-section-title"><div><div class="hp-kicker">Hugo service</div><h2>${t("orderSteps")}</h2><p>${t("orderStepsSub")}</p></div></div><div class="hp-order-steps"><div><b>01</b><strong>${t("orderStepOne")}</strong><p>${t("orderStepOneSub")}</p></div><div><b>02</b><strong>${t("orderStepTwo")}</strong><p>${t("orderStepTwoSub")}</p></div><div><b>03</b><strong>${t("orderStepThree")}</strong><p>${t("orderStepThreeSub")}</p></div></div><div class="hp-order-guide-foot"><span>${icon("truck")}${t("deliveryNote")}</span><span><b>${t("trustQuestion")}</b> ${t("trustQuestionSub")}</span></div></section>`);
      content.querySelector(".hp-order-steps").insertAdjacentHTML("afterend", `<h3 class="hp-trust-heading">${t("trustDetails")}</h3><div class="hp-trust-grid">${[
        ["shield-check", "trustWarranty", "trustWarrantyText"],
        ["credit-card", "trustPayment", "trustPaymentText"],
        ["truck", "trustDelivery", "trustDeliveryText"],
        ["badge-check", "trustInspection", "trustInspectionText"],
        ["rotate-ccw", "trustReturns", "trustReturnsText"],
      ].map(([symbol, title, details]) => `<div>${icon(symbol)}<strong>${t(title)}</strong><p>${t(details)}</p></div>`).join("")}</div>`);
      if (featured) {
        content.querySelector(".hp-featured-product").outerHTML = `<div class="hp-featured-product"><button type="button" class="hp-featured-image" data-detail="${featured.id}" aria-label="${esc(t("heroView"))}: ${esc(featured.name)}">${featured.images.length ? `<img src="${esc(pictureUrl(featured.images[0]))}" alt="${esc(featured.name)}">` : icon("laptop")}</button><div class="hp-featured-info"><span>${esc(featured.brand)}</span><strong>${esc(productTitle(featured))}</strong><small>${esc(featured.cpu)} · ${esc(featured.ram)} GB RAM · ${esc(featured.ssd)} GB SSD</small><div class="hp-featured-facts">${featured.condition ? `<span>${t("conditionShort")}: ${esc(localizedValue(featured.condition))}</span>` : ""}${featured.warranty ? `<span>${t("warrantyShort")}: ${esc(localizedValue(featured.warranty))}</span>` : ""}</div><div class="hp-featured-bottom"><span class="hp-featured-price">${t("heroFrom")} <b>${money(effectivePrice(featured))} zł</b></span><button type="button" class="hp-button hp-primary" data-order-one="${featured.id}">${icon("send")}${t("orderNow")}</button></div></div></div>`;
      }
      const strip = document.createElement("aside");
      strip.className = "hp-channel-strip";
      strip.innerHTML = `<span>${icon("send")}${t("channelStrip")}</span><a href="https://t.me/h_m_g_pl" target="_blank" rel="noopener noreferrer" data-track-target="telegram_channel">${t("subscribe")}${icon("arrow-up-right")}</a>`;
      content.prepend(strip);
    }
    if (view === "catalog") {
      const vals = (k) =>
        [
          ...new Set(
            eligible()
              .map((p) => p[k])
              .filter(Boolean),
          ),
        ].sort();
      content.innerHTML = `<div class="hp-intro"><div><div class="hp-kicker">Hugo selection</div><h1>${t("title")}</h1><span class="hp-muted">${t("subtitle")}</span><div class="hp-trust">${icon("check")}<span>${t("catalogTrust")}</span></div></div><a class="hp-button hp-small" href="https://t.me/HUGO_Media" target="_blank" rel="noopener noreferrer" data-track-target="telegram_contact">${icon("message-circle")}${t("ask")}</a></div><button type="button" class="hp-button hp-mobile-filter" id="hp-filter-toggle" aria-expanded="false">${icon("sliders-horizontal")}${t("filters")}</button><button type="button" class="hp-filter-backdrop" id="hp-filter-backdrop" aria-label="${t("closeFilters")}"></button><div class="hp-shop"><aside class="hp-filters"><button type="button" class="hp-filter-close" id="hp-filter-close">${icon("x")}${t("closeFilters")}</button><h3>${t("filters")}</h3><label class="hp-field">${t("price")}<div class="hp-prices"><input type="number" min="0" data-filter="min" aria-label="${t("min")}" placeholder="${t("min")}" value="${esc(filters.min || "")}"><input type="number" min="0" data-filter="max" aria-label="${t("max")}" placeholder="${t("max")}" value="${esc(filters.max || "")}"></div></label>${selectFilter("brand", t("brand"), vals("brand"))}<label class="hp-field">${t("purpose")}<select data-filter="purpose">${option("", t("any"), filters.purpose || "")}${PURPOSES.map((code) => option(code, t(purposeKey(code)), filters.purpose)).join("")}</select></label>${filterKeys(
        cat,
      )
        .map(([key, label]) => selectFilter(key, t(label), vals(key)))
        .join(
          "",
        )}<button type="button" class="hp-back" id="hp-reset">${t("reset")}</button></aside><section><div class="hp-toprow"><span id="hp-results" class="hp-muted hp-small" aria-live="polite"></span><select class="hp-sort" id="hp-sort" aria-label="${t("newest")}">${["newest", "cheap", "expensive"].map((s) => option(s, t(s), sort)).join("")}</select></div><div class="hp-grid" id="hp-grid"></div></section></div>`;
      cards();
    }
    if (view === "detail") {
      const p = products.find((p) => p.id === selected);
      if (!p) {
        view = "catalog";
        render();
        return;
      }
      const specs = [
          ...filterKeys(p.cat).map(([key, label]) => [t(label), p[key]]),
          [t("condition"), p.condition || t("stateValue")],
          [t("warranty"), p.warranty || t("unknown")],
          ...(p.charger ? [[t("charger"), chargerLabel(p.charger)]] : []),
        ].filter((x) => x[1]),
        qty = stockQty(p),
        purposeCodes = csv(p.purposes),
        benefitCodes = csv(p.benefits),
        bundleCodes = csv(p.bundles),
        chosenBundles = csv(bundleSelections[p.id]),
        description = p[lang === "uk" ? "descUk" : "descPl"],
        similar = products
          .filter(
            (x) =>
              x.id !== p.id &&
              x.cat === p.cat &&
              x.status === 0 &&
              stockQty(x) > 0,
          )
          .sort((a, b) => Math.abs(effectivePrice(a) - effectivePrice(p)) - Math.abs(effectivePrice(b) - effectivePrice(p)))
          .slice(0, 3);
      content.innerHTML = `<div class="hp-detail-page"><button type="button" class="hp-back hp-detail-back" data-view="catalog">${icon("arrow-left")}${t("back")}</button><section class="hp-detail-hero"><div class="hp-gallery-panel"><div class="hp-gallery-head"><span>${icon("camera")}${t("productPhoto")}</span><span>HMG-${p.id.toString().padStart(3, "0")}</span></div>${photo(p)}${p.images.length > 1 ? `<div class="hp-toprow hp-thumbs">${p.images.map((src, i) => `<button type="button" class="hp-button" data-image="${i}"><img src="${esc(pictureUrl(src))}" alt="${i + 1}"></button>`).join("")}</div>` : ""}<a class="hp-gallery-link" href="${esc(telegramPostUrl(p.telegramPost))}" target="_blank" rel="noopener noreferrer">${icon("play-circle")}${t("seeTelegram")}${icon("arrow-right")}</a></div><div class="hp-buy-panel"><div class="hp-kicker">${esc(p.brand)} · ${t("verifiedLabel")}</div><h1>${esc(productTitle(p))}</h1><p class="hp-detail-config">${esc(p.cpu)}${p.ram ? ` · ${esc(p.ram)} GB RAM` : ""}${p.ssd ? ` · ${esc(p.ssd)} GB${p.cat === 0 ? " SSD" : ""}` : ""}${p.gpu ? ` · ${esc(p.gpu)}` : ""}</p><div class="hp-detail-badges"><span class="hp-demo-status">${t("statuses")[p.status]}</span>${p.newArrival === "true" ? `<span class="hp-badge-new">${t("newArrival")}</span>` : ""}${p.bestseller === "true" ? `<span class="hp-badge-best">${t("bestseller")}</span>` : ""}${discountPercent(p) ? `<span class="hp-badge-sale">-${discountPercent(p)}%</span>` : ""}</div><div class="hp-stock ${qty === 1 ? "hp-stock-low" : ""}">${qty === 1 ? t("onlyOne") : `${qty} ${t("unitsLeft")}`}</div>${priceBlock(p, true)}${purposeCodes.length ? `<div class="hp-purpose-tags">${purposeCodes.map((code) => `<span>${t(purposeKey(code))}</span>`).join("")}</div>` : ""}<div class="hp-buy-copy"><b>${t("buyPanelTitle")}</b><span>${t("buyPanelSub")}</span></div><div class="hp-detail-actions hp-detail-primary-actions"><button type="button" class="hp-button hp-primary" data-order-one="${p.id}" ${p.status !== 0 || qty < 1 ? "disabled" : ""}>${icon("send")}${t("orderNow")}</button><a class="hp-button hp-channel-button" href="${esc(telegramPostUrl(p.telegramPost))}" target="_blank" rel="noopener noreferrer">${icon("play-circle")}${t("telegramMedia")}</a></div><div class="hp-detail-secondary-actions"><button type="button" class="hp-button hp-choice-button" data-add="${p.id}" ${p.status !== 0 || qty < 1 ? "disabled" : ""}>${icon(cart.includes(p.id) ? "check" : "shopping-bag")}${cart.includes(p.id) ? t("added") : t("add")}</button><button type="button" class="hp-button" data-compare="${p.id}">${icon(compare.includes(p.id) ? "check" : "columns-2")}${t("compare")}</button><button type="button" class="hp-button" id="hp-share" aria-label="${t("share")}">${icon("share-2")}</button></div><div class="hp-detail-trust"><span>${icon("badge-check")}${t("secureDeal")}</span><span>${icon("shield-check")}${t("warrantyBenefit")}</span><span>${icon("message-circle")}${t("fastContact")}</span></div></div></section><section class="hp-detail-lower"><div class="hp-detail-info-card"><div class="hp-section-title"><div><div class="hp-kicker">${t("configuration")}</div><h2>${t("specTitle")}</h2></div></div><div class="hp-detailspec">${specs.map(([k, v]) => `<div><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join("")}</div></div>${benefitCodes.length || bundleCodes.length || description ? `<div class="hp-detail-extras">${benefitCodes.length ? `<section class="hp-sales-block"><h3>${t("advantages")}</h3><div class="hp-benefit-list">${benefitCodes.map((code) => `<span>${icon("check-circle-2")}${t(benefitKey(code))}</span>`).join("")}</div></section>` : ""}${bundleCodes.length ? `<section class="hp-sales-block"><h3>${t("bundles")}</h3><div class="hp-bundle-list">${bundleCodes.map((code) => `<label><input type="checkbox" data-bundle="${code}" data-product="${p.id}" ${chosenBundles.includes(code) ? "checked" : ""}><span>${t(bundleKey(code))}</span></label>`).join("")}</div></section>` : ""}${description ? `<section class="hp-sales-block"><h3>${t("aboutDevice")}</h3><p class="hp-description">${esc(description)}</p></section>` : ""}</div>` : ""}</section>${reviewsBlock(3)}${similar.length ? `<section class="hp-home-section hp-similar-section"><div class="hp-section-title"><h2>${t("similar")}</h2></div><div class="hp-grid">${similar.map(productCard).join("")}</div></section>` : ""}</div>`;
      if (p.charger && chargerLabel(p.charger)) {
        const note = `${t("charger")}: ${chargerLabel(p.charger)}`;
        content.querySelector(".hp-detail-config").insertAdjacentHTML("afterend", `<p class="hp-charger-note">${icon("plug-zap")}${esc(note)}</p>`);
        const descriptionBlock = content.querySelector(".hp-description");
        if (descriptionBlock) descriptionBlock.insertAdjacentHTML("beforeend", `<br>${esc(note)}`);
        else content.querySelector(".hp-detail-lower").insertAdjacentHTML("beforeend", `<section class="hp-sales-block hp-charger-description"><h3>${t("aboutDevice")}</h3><p>${esc(note)}</p></section>`);
      }
      content
        .querySelectorAll(".hp-gallery-link,.hp-channel-button")
        .forEach((link) => (link.dataset.trackTarget = "telegram_product"));
      const related = content.querySelector(".hp-similar-section");
      if (related) {
        const candidates = products.filter((item) => item.id !== p.id && item.cat === p.cat && item.status === 0 && stockQty(item) > 0);
        const chosen = [], used = new Set();
        const pick = (label, items) => {
          const item = items.find((candidate) => !used.has(candidate.id));
          if (item) { chosen.push({ label, item }); used.add(item.id); }
        };
        pick(t("lowerPrice"), [...candidates].filter((item) => effectivePrice(item) < effectivePrice(p)).sort((a, b) => effectivePrice(b) - effectivePrice(a)));
        const baseline = cpuLevel(p);
        pick(t("strongerOption"), [...candidates].filter((item) => {
          const option = cpuLevel(item);
          return baseline && option && option.family === baseline.family && option.rank > baseline.rank && Number(item.ram) >= Number(p.ram);
        }).sort((a, b) => effectivePrice(a) - effectivePrice(b)));
        pick(t("underBudget"), [...candidates].filter((item) => effectivePrice(item) <= 1500).sort((a, b) => Number(b.ram) - Number(a.ram) || Number(b.ssd) - Number(a.ssd) || effectivePrice(a) - effectivePrice(b)));
        if (chosen.length) related.innerHTML = `<div class="hp-section-title"><h2>${t("similar")}</h2></div><div class="hp-grid">${chosen.map(({ label, item }) => `<div class="hp-recommendation"><span>${esc(label)}</span>${productCard(item)}</div>`).join("")}</div>`;
      }
      content.insertAdjacentHTML("beforeend", `<div class="hp-mobile-order-bar"><div><small>${esc(productTitle(p))}</small><strong>${money(effectivePrice(p))} zł</strong></div><button type="button" class="hp-button hp-primary" data-order-one="${p.id}" ${p.status !== 0 || qty < 1 ? "disabled" : ""}>${t("orderNow")}</button><a href="${esc(telegramPostUrl(p.telegramPost))}" target="_blank" rel="noopener noreferrer" data-track-target="telegram_product" aria-label="${t("telegramMedia")}">${icon("send")}<span>Telegram</span></a></div>`);
    }
    if (view === "compare") {
      const items = products.filter((p) => compare.includes(p.id));
      const rows = [
        ["price", t("price")],
        ["cpu", t("cpu")],
        ["generation", t("generation")],
        ["ram", t("ram")],
        ["ssd", t("ssd")],
        ["gpu", t("gpu")],
        ["screen", t("screen")],
        ["condition", t("condition")],
        ["warranty", t("warranty")],
      ];
      content.innerHTML = `<button type="button" class="hp-back" data-view="catalog">${icon("arrow-left")}${t("back")}</button><div class="hp-intro"><h1>${t("comparison")}</h1></div>${items.length > 1 ? `<div class="hp-compare-wrap"><table class="hp-compare-table"><thead><tr><th></th>${items.map((p) => `<th>${esc(p.name)}<button type="button" data-compare="${p.id}" aria-label="${t("remove")}">${icon("x")}</button></th>`).join("")}</tr></thead><tbody>${rows.map(([key, label]) => `<tr><th>${label}</th>${items.map((p) => `<td>${key === "price" ? `${money(effectivePrice(p))} zł` : esc(p[key] || "—")}</td>`).join("")}</tr>`).join("")}</tbody></table></div>` : `<div class="hp-empty"><p>${t("compareLimit")}</p><button class="hp-button hp-primary" data-view="catalog">${t("continue")}</button></div>`}`;
    }
    if (view === "cart") {
      const items = products.filter((p) => cart.includes(p.id));
      const total = items.reduce(
        (s, p) => s + effectivePrice(p) + bundleExtra(p.id),
        0,
      );
      const message = orderText(items, lang, location.origin, bundleSelections);
      content.innerHTML = `<button type="button" class="hp-back" data-view="catalog">${icon("arrow-left")}${t("back")}</button><div class="hp-intro"><div><h1>${t("cartTitle")}</h1><span class="hp-muted">${t("cartSub")}</span></div></div>${
        items.length
          ? `<div class="hp-cart-layout"><div>${items
              .map(
                (p) =>
                  `<div class="hp-cart-item">${photo(p)}<div class="hp-cart-text"><b>${esc(p.name)}</b><div class="hp-muted hp-small">HMG-${String(p.id).padStart(3, "0")}</div><strong>${money(effectivePrice(p) + bundleExtra(p.id))} zł${discountPercent(p) ? ` · -${discountPercent(p)}%` : ""}</strong>${
                    csv(bundleSelections[p.id]).length
                      ? `<small>${csv(bundleSelections[p.id])
                          .map((k) => t(bundleKey(k)))
                          .join(" · ")}</small>`
                      : ""
                  }</div><button type="button" data-remove="${p.id}" aria-label="${t("remove")}: ${esc(p.name)}">${icon("x")}</button></div>`,
              )
              .join(
                "",
              )}</div><div class="hp-summary"><div class="hp-toprow"><span>${t("total")}</span><span class="hp-money">${money(total)} zł</span></div><p class="hp-small hp-muted">${t("cartNote")}</p><button type="button" class="hp-button hp-primary" id="hp-send">${icon("send")}${t("request")}</button><textarea readonly id="hp-message" aria-label="${t("request")}">${esc(message)}</textarea><button type="button" class="hp-button" id="hp-copy">${icon("copy")}${t("copy")}</button><div class="hp-toast" id="hp-toast" aria-live="polite"></div><div class="hp-note">${t("demoCart")}</div></div></div>`
          : `<div class="hp-empty"><p>${t("cartEmpty")}</p><button type="button" class="hp-button hp-primary" data-view="catalog">${t("continue")}</button></div>`
      }`;
    }
    if (view === "admin") {
      content.innerHTML = `${adminNav("admin")}${passwordSetup ? `<form id="hp-password-setup" class="hp-form hp-login"><h2>${t(passwordSetup ? "setPassword" : "changePassword")}</h2><label class="hp-field">${t("newPassword")}<input name="password" type="password" required autocomplete="new-password" minlength="8"></label><p class="hp-muted hp-small">${t("passwordHint")}</p><p id="hp-password-error" role="alert"></p><button type="submit" class="hp-button hp-primary">${t("savePassword")}</button></form>` : ""}<div class="hp-intro"><div><h1>${t("manage")}</h1><span class="hp-muted">${t("manageSub")}</span></div><button type="button" class="hp-button hp-primary" id="hp-new">${icon("plus")}${t("newProduct")}</button></div><div class="hp-admin-list">${products
        .map(
          (p) =>
            `<div class="hp-admin-row"><div><b>${esc(p.name)}</b><div class="hp-small hp-muted">HMG-${String(p.id).padStart(3, "0")} · ${t("categories")[p.cat]}${p.newArrival === "true" ? ` · ${t("newArrival")}` : ""}${p.bestseller === "true" ? ` · ${t("bestseller")}` : ""}${discountPercent(p) ? ` · -${discountPercent(p)}%` : ""}</div></div><b>${money(effectivePrice(p))} zł</b><select data-status="${p.id}" aria-label="${t("status")}: ${esc(p.name)}">${t(
              "statuses",
            )
              .map((s, i) => option(i, s, p.status))
              .join(
                "",
              )}</select><div class="hp-admin-actions"><button type="button" data-edit="${p.id}" aria-label="${t("edit")}: ${esc(p.name)}">${icon("pencil")}</button><button type="button" data-duplicate="${p.id}" aria-label="${t("duplicate")}: ${esc(p.name)}">${icon("copy")}</button><button type="button" data-delete="${p.id}" aria-label="${t("delete")}: ${esc(p.name)}">${icon("trash-2")}</button></div></div>`,
        )
        .join(
          "",
        )}</div><div class="hp-note">${t("adminNote")}</div><button type="button" class="hp-button" id="hp-signout">${t("signout")}</button>`;
    }
    if (view === "reviews") renderReviewsAdmin();
    if (view === "reviewEdit") renderReviewForm();
    if (view === "stats") renderAnalytics();
    if (view === "activity") {
      if (owner) renderAudit();
      else { view = "admin"; history.replaceState(null, "", "?admin"); render(); return; }
    }
    if (view === "edit") renderForm();
    refreshIcons();
    renderCompareDock();
  }
  function field(key, label, value = "", type = "text", required = false) {
    return `<label class="hp-field">${label}<input name="${key}" value="${esc(value)}" type="${type}" ${required ? "required" : ""} ${type === "number" ? 'min="0" step="any"' : ""}></label>`;
  }
  function choiceField(
    key,
    label,
    values,
    value = "",
    required = false,
    id = "",
  ) {
    const choices = [...values];
    if (value && !choices.includes(String(value)))
      choices.unshift(String(value));
    return `<label class="hp-field">${label}<select name="${key}" ${id ? `id="${id}"` : ""} ${required ? "required" : ""}>${required && !value ? '<option value="" selected disabled>—</option>' : ""}${choices.map((v) => option(v, v, value)).join("")}</select></label>`;
  }
  function renderForm() {
    const p = products.find((p) => p.id === editId) || {
      name: "",
      price: "",
      brand: "",
      cat: cat < 0 ? 0 : cat,
      status: 3,
      newArrival: "",
      bestseller: "",
      discount: "0",
      telegramPost: "",
      quantity: "1",
      purposes: "",
      benefits: "tested",
      bundles: "",
    };
    const shareButtons = editId
      ? `<section class="hp-form-section"><h3 class="hp-section-heading">${t("shareFor")}</h3><div class="hp-social-buttons">${["facebook", "tiktok", "instagram", "telegram"].map((source) => `<button type="button" class="hp-button" data-social="${source}" data-product="${p.id}">${t("share" + source[0].toUpperCase() + source.slice(1))}</button>`).join("")}</div></section>`
      : "";
    q("#hp-content").innerHTML =
      `<button type="button" class="hp-back" data-view="admin">${icon("arrow-left")}${t("admin")}</button><div class="hp-edit-heading"><h2>${editId ? t("edit") : t("newProduct")}</h2><span class="hp-muted hp-small">${t("manageSub")}</span></div><form class="hp-form" id="hp-form"><section class="hp-form-section"><h3 class="hp-section-heading">${t("basicInfo")}</h3><div class="hp-form-grid"><div class="hp-wide">${field("name", t("name"), p.name, "text", true)}</div><label class="hp-field">${t("category")}<select name="cat" id="hp-form-cat">${t(
        "categories",
      )
        .map((c, i) => option(i, c, p.cat))
        .join(
          "",
        )}</select></label><div id="hp-brand-field">${choiceField("brand", t("brand"), categoryChoices[p.cat].brand, p.brand, true)}</div>${field("price", t("regularPrice"), p.price, "number", true)}<label class="hp-field">${t("quantity")}<select name="quantity">${Array.from({ length: 11 }, (_, i) => option(i, i, p.quantity || 1)).join("")}</select></label><label class="hp-field">${t("status")}<select name="status">${t(
        "statuses",
      )
        .map((s, i) => option(i, s, p.status))
        .join(
          "",
        )}</select></label>${choiceField("condition", t("condition"), commonChoices.condition, p.condition, true)}${choiceField("warranty", t("warranty"), commonChoices.warranty, p.warranty, true)}<label class="hp-field">${t("markNewArrival")}<select name="newArrival">${option("", t("no"), p.newArrival || "")}${option("true", t("yes"), p.newArrival || "")}</select></label><label class="hp-field">${t("markBestseller")}<select name="bestseller">${option("", t("no"), p.bestseller || "")}${option("true", t("yes"), p.bestseller || "")}</select></label><label class="hp-field">${t("discount")}<select name="discount">${DISCOUNTS.map((value) => option(value, value ? `-${value}%` : t("noDiscount"), discountPercent(p))).join("")}</select></label>${checkGroup("purposes", t("purpose"), PURPOSES, p.purposes, purposeKey)}${checkGroup("benefits", t("advantages"), BENEFITS, p.benefits, benefitKey)}${checkGroup("bundles", t("bundles"), Object.keys(BUNDLES), p.bundles, bundleKey)}</div></section><section class="hp-form-section"><h3 class="hp-section-heading">${t("spec")}</h3><div class="hp-form-grid" id="hp-category-fields"></div></section><section class="hp-form-section"><h3 class="hp-section-heading">${t("mediaInfo")}</h3><div class="hp-form-grid"><label class="hp-field hp-wide">${t("telegramPost")}<input type="text" inputmode="url" name="telegramPost" value="${esc(p.telegramPost || "")}" placeholder="https://t.me/h_m_g_pl/123"><span class="hp-muted hp-small">${t("telegramPostHint")}</span></label><label class="hp-field hp-wide">${t("photos")}<input type="file" id="hp-upload" multiple accept="image/jpeg,image/png,image/webp"><span class="hp-muted hp-small">${t("photoHint")}</span><div id="hp-upload-previews" class="hp-toprow"></div></label><label class="hp-field">${t("descUk")}<textarea name="descUk">${esc(p.descUk)}</textarea></label><label class="hp-field">${t("descPl")}<textarea name="descPl">${esc(p.descPl)}</textarea></label></div></section>${shareButtons}<div role="alert" id="hp-form-error" class="hp-alert"></div><div class="hp-form-actions"><button type="button" class="hp-button" data-view="admin">${t("cancel")}</button><button type="submit" class="hp-button hp-primary">${t("save")}</button></div></form>`;
    q('#hp-form select[name="warranty"]')?.closest(".hp-field")?.insertAdjacentHTML("afterend", `<label class="hp-field">${t("charger")}<select name="charger">${option("", t("chargerUnknown"), p.charger || "")}${["adapter", "cable", "none"].map((value) => option(value, chargerLabel(value), p.charger || "")).join("")}</select></label>`);
    formCategory(p.cat, p);
    showUploads();
  }
  function filterKeys(c) {
    return c === 0 || c === -1
      ? [
          ["cpu", "cpu"],
          ["generation", "generation"],
          ["ram", "ram"],
          ["ssd", "ssd"],
          ["gpu", "gpu"],
          ["screen", "screen"],
        ]
      : c === 1 || c === 2
        ? [
            ["ram", "ram"],
            ["ssd", "memory"],
            ["screen", "screen"],
            ["os", "os"],
            ["sim", "sim"],
          ]
        : c === 3
          ? [
              ["type", "type"],
              ["noise", "noise"],
            ]
          : c === 4
            ? [
                ["compatibility", "compatibility"],
                ["gps", "gps"],
                ["lte", "lte"],
              ]
            : [
                ["screen", "screen"],
                ["resolution", "resolution"],
                ["hz", "hz"],
              ];
  }
  function formCategory(c, p = {}) {
    const defs = filterKeys(c);
    if (c === 1 || c === 2) defs.push(["cpu", "cpu"], ["battery", "battery"]);
    q("#hp-category-fields").innerHTML = defs
      .map(([key, label]) =>
        choiceField(
          key,
          t(label),
          categoryChoices[c][key] || [],
          p[key] || "",
          true,
        ),
      )
      .join("");
    const brand = q("#hp-brand-field");
    if (brand)
      brand.innerHTML = choiceField(
        "brand",
        t("brand"),
        categoryChoices[c].brand,
        p.brand || "",
        true,
      );
  }
  function showUploads() {
    q("#hp-upload-previews").innerHTML = formImages
      .map(
        (src, i) =>
          `<div style="margin-top:10px"><img src="${esc(pictureUrl(src))}" alt="${i + 1}" style="width:74px;height:64px;object-fit:contain"><button type="button" data-remove-photo="${i}" aria-label="${t("remove")} ${i + 1}">×</button>${i ? `<button type="button" data-main-photo="${i}" aria-label="${t("mainPhoto")}">★</button>` : ""}</div>`,
      )
      .join("");
  }
  function renderLogin() {
    document.documentElement.lang = lang;
    all("[data-lang]").forEach((b) =>
      b.setAttribute("aria-pressed", b.dataset.lang === lang),
    );
    q("#hp-content").innerHTML =
      `<form id="hp-login" class="hp-form hp-login"><h2>${t("login")}</h2>${!db.ready ? `<p>${t("unconfigured")}</p>` : `<label class="hp-field">${t("email")}<input name="email" type="email" required autocomplete="username"></label><label class="hp-field">${t("password")}<input name="password" type="password" required autocomplete="current-password" minlength="6"></label><p id="hp-login-error" role="alert"></p><button type="submit" class="hp-button hp-primary">${t("signin")}</button>`}</form>`;
  }
  root.addEventListener("error", (event) => {
    const img = event.target;
    if (!(img instanceof HTMLImageElement) || !img.closest(".hp-photo,.hp-featured-image")) return;
    const placeholder = document.createElement("span");
    placeholder.className = "hp-image-fallback";
    placeholder.textContent = t("noPhoto");
    img.replaceWith(placeholder);
  }, true);
  root.addEventListener("click", async (e) => {
    const link = e.target.closest("a");
    if (link?.href?.includes("t.me"))
      recordEvent(
        "telegram_click",
        view === "detail" ? selected : null,
        link.dataset.trackTarget ||
          (view === "detail" ? "telegram_product" : "telegram_contact"),
      );
    const b = e.target.closest("button");
    if (!b || busy) return;
    if (b.id === "hp-privacy-accept" || b.id === "hp-privacy-decline") {
      setAnalyticsConsent(b.id === "hp-privacy-accept");
      return;
    }
    if (b.id === "hp-privacy-settings") {
      consentOpen = true;
      renderConsent();
      return;
    }
    if (
      (view === "edit" || view === "reviewEdit") &&
      (b.dataset.view || b.dataset.lang || b.dataset.cat) &&
      !confirm(t("abandon"))
    )
      return;
    if (b.classList.contains("hp-brand")) {
      view = "home";
      cat = -1;
      filters = {};
      search = "";
      history.replaceState(null, "", "/");
      q("#hp-search").value = "";
      render();
    } else if (b.dataset.statsRange) {
      statsRange = Number(b.dataset.statsRange);
      await loadAnalytics();
    } else if (b.dataset.statMetric) {
      statsMetric = b.dataset.statMetric;
      render();
    } else if (b.id === "hp-stat-close") {
      statsMetric = "";
      render();
    } else if (b.hasAttribute("data-start-catalog")) {
      recordEvent("catalog_click", null, "catalog");
      view = "catalog";
      cat = -1;
      const campaign = new URLSearchParams(location.search);
      history.replaceState(null, "", `/${campaign.size ? `?${campaign}` : ""}`);
      render();
    } else if (b.dataset.view) {
      if (view === "edit") clearPictures();
      view = b.dataset.view;
      history.replaceState(
        null,
        "",
        view === "admin"
          ? "?admin"
          : view === "stats"
            ? "?admin=stats"
            : view === "reviews"
              ? "?admin=reviews"
              : view === "activity"
                ? "?admin=activity"
              : "/",
      );
      if (view === "cart")
        await run(async () => {
          await refresh();
          render();
        });
      else if (view === "stats") await loadAnalytics();
      else if (view === "activity") await loadAudit();
      else render();
    } else if (b.dataset.lang) {
      if (view === "edit") {
        clearPictures();
        view = "admin";
      }
      lang = b.dataset.lang;
      writeLocal("hmg-language", lang);
      render();
    } else if (b.dataset.cat !== undefined) {
      if (view === "edit") clearPictures();
      cat = Number(b.dataset.cat);
      filters = {};
      view = "catalog";
      render();
    } else if (b.dataset.detail) {
      selected = Number(b.dataset.detail);
      view = "detail";
      history.replaceState(null, "", `?product=${selected}`);
      render();
      window.scrollTo(0, 0);
      recordEvent("product_view", selected);
    } else if (b.dataset.orderOne) {
      const p = products.find((p) => p.id === Number(b.dataset.orderOne));
      if (!p || p.status !== 0 || stockQty(p) < 1) return;
      await recordBeforeNavigation("telegram_click", p.id, "telegram_order");
      location.href = telegramLink(
        orderText([p], lang, location.origin, bundleSelections),
      );
    } else if (b.dataset.add) {
      const id = Number(b.dataset.add);
      if (
        !products.some((p) => p.id === id && p.status === 0 && stockQty(p) > 0)
      )
        return;
      const adding = !cart.includes(id);
      cart = adding ? [...cart, id] : cart.filter((x) => x !== id);
      writeLocal("hmg-cart", cart);
      render();
      if (adding) recordEvent("cart_add", id);
    } else if (b.dataset.remove) {
      cart = cart.filter((x) => x !== Number(b.dataset.remove));
      writeLocal("hmg-cart", cart);
      render();
    } else if (b.dataset.compare) {
      const id = Number(b.dataset.compare);
      if (compare.includes(id)) compare = compare.filter((x) => x !== id);
      else if (compare.length < 3) {
        compare = [...compare, id];
        recordEvent("compare_add", id);
      } else {
        notify(t("compareLimit"));
        return;
      }
      writeLocal("hmg-compare", compare);
      render();
    } else if (b.id === "hp-clear-compare") {
      compare = [];
      writeLocal("hmg-compare", compare);
      if (view === "compare") view = "catalog";
      render();
    } else if (b.id === "hp-reset") {
      filters = {};
      search = "";
      q("#hp-search").value = "";
      render();
    } else if (b.id === "hp-filter-toggle") {
      const open = q(".hp-filters").classList.toggle("hp-show");
      q(".hp-filter-backdrop")?.classList.toggle("hp-show", open);
      b.setAttribute("aria-expanded", open);
    } else if (b.id === "hp-filter-close" || b.id === "hp-filter-backdrop") {
      q(".hp-filters")?.classList.remove("hp-show");
      q(".hp-filter-backdrop")?.classList.remove("hp-show");
      q("#hp-filter-toggle")?.setAttribute("aria-expanded", "false");
    } else if (b.dataset.edit || b.id === "hp-new") {
      if (!admin) return;
      clearPictures();
      editId = b.dataset.edit ? Number(b.dataset.edit) : null;
      formImages = editId
        ? [...products.find((p) => p.id === editId).images]
        : [];
      view = "edit";
      render();
    } else if (b.id === "hp-new-review" || b.dataset.editReview) {
      if (!admin) return;
      editReviewId = b.dataset.editReview ? Number(b.dataset.editReview) : null;
      reviewImage = null;
      view = "reviewEdit";
      render();
    } else if (b.dataset.deleteReview) {
      if (admin && confirm(t("deleteReview")))
        await run(async () => {
          await db.deleteReview(Number(b.dataset.deleteReview));
          await refresh();
          render();
          notify(t("saved"));
        });
    } else if (b.dataset.delete) {
      if (admin && confirm(t("confirmDelete")))
        await run(async () => {
          await db.deleteProduct(Number(b.dataset.delete));
          await refresh();
          render();
          notify(t("saved"));
        });
    } else if (b.dataset.duplicate) {
      if (admin)
        await run(async () => {
          const p = products.find((p) => p.id === Number(b.dataset.duplicate));
          await db.saveProduct({ ...p, id: null, status: 3 }, p.images);
          await refresh();
          render();
          notify(t("saved"));
        });
    } else if (b.dataset.removePhoto !== undefined) {
      const [pic] = formImages.splice(Number(b.dataset.removePhoto), 1);
      if (typeof pic !== "string") URL.revokeObjectURL(pic.url);
      showUploads();
    } else if (b.dataset.mainPhoto !== undefined) {
      formImages.unshift(formImages.splice(Number(b.dataset.mainPhoto), 1)[0]);
      showUploads();
    } else if (b.dataset.image !== undefined) {
      q(".hp-detail .hp-photo img").src = pictureUrl(
        products.find((p) => p.id === selected).images[Number(b.dataset.image)],
      );
    } else if (b.id === "hp-remove-review-photo") {
      if (reviewImage && typeof reviewImage !== "string")
        URL.revokeObjectURL(reviewImage.url);
      reviewImage = "";
      renderReviewForm();
    } else if (b.dataset.landingSocial) {
      await navigator.clipboard.writeText(landingUrl(b.dataset.landingSocial));
      notify(t("linkCopied"));
    } else if (b.dataset.social) {
      const text = socialUrl(Number(b.dataset.product), b.dataset.social);
      await navigator.clipboard.writeText(text);
      notify(t("linkCopied"));
    } else if (b.id === "hp-copy" || b.id === "hp-share") {
      const url = `${location.origin}/?product=${selected}`,
        p = products.find((x) => x.id === selected),
        text = b.id === "hp-copy" ? q("#hp-message").value : url;
      if (b.id === "hp-share" && navigator.share) {
        try {
          await navigator.share({
            title: p?.name || "Hugo Media",
            text: p
              ? `${p.name} — ${money(effectivePrice(p))} zł`
              : "Hugo Media",
            url,
          });
          return;
        } catch (error) {
          if (error.name === "AbortError") return;
        }
      }
      try {
        await navigator.clipboard.writeText(text);
        notify(t("copied"));
      } catch {
        if (q("#hp-message")) q("#hp-message").select();
        notify(b.id === "hp-copy" ? t("copyFallback") : text);
      }
    } else if (b.id === "hp-signout") {
      await run(async () => {
        await db.signOut();
        admin = false;
        owner = false;
        view = "home";
        await refresh();
        render();
      });
    } else if (b.id === "hp-retry") {
      await initialize();
    } else if (b.id === "hp-send") {
      await run(async () => {
        const before = JSON.stringify(cart);
        await refresh();
        if (before !== JSON.stringify(cart)) {
          render();
          notify(t("stale"));
          return;
        }
        const items = products.filter((p) => cart.includes(p.id));
        if (!items.length) {
          render();
          return;
        }
        const text = orderText(items, lang, location.origin, bundleSelections);
        await recordBeforeNavigation("telegram_click", null, "telegram_cart_order");
        location.href = telegramLink(text);
      });
    }
  });
  root.addEventListener("input", (e) => {
    if (e.target.id === "hp-search") {
      if (view === "edit") return;
      search = e.target.value;
      if (view !== "catalog") {
        view = "catalog";
        render();
      } else if (q("#hp-grid")) cards();
    } else if (e.target.matches("input[data-filter]")) {
      filters[e.target.dataset.filter] = e.target.value;
      cards();
    }
  });
  root.addEventListener("change", async (e) => {
    const el = e.target;
    if (el.matches("select[data-filter]")) {
      filters[el.dataset.filter] = el.value;
      cards();
    } else if (el.id === "hp-sort") {
      sort = el.value;
      cards();
    } else if (el.dataset.bundle) {
      const id = Number(el.dataset.product),
        chosen = new Set(csv(bundleSelections[id]));
      el.checked
        ? chosen.add(el.dataset.bundle)
        : chosen.delete(el.dataset.bundle);
      bundleSelections[id] = [...chosen].join(",");
      writeLocal("hmg-bundles", bundleSelections);
      if (el.checked) recordEvent("bundle_select", id);
      render();
    } else if (el.dataset.status) {
      await run(async () => {
        await db.setStatus(Number(el.dataset.status), Number(el.value));
        await refresh();
        render();
        notify(t("saved"));
      });
    } else if (el.id === "hp-form-cat") {
      formCategory(Number(el.value));
    } else if (el.id === "hp-review-upload") {
      await run(async () => {
        const file = el.files?.[0];
        if (!file) return;
        const blob = await db.compressPhoto(file);
        if (reviewImage && typeof reviewImage !== "string")
          URL.revokeObjectURL(reviewImage.url);
        reviewImage = { blob, url: URL.createObjectURL(blob) };
        renderReviewForm();
      });
    } else if (el.id === "hp-upload") {
      await run(async () => {
        const files = [...el.files];
        if (files.length + formImages.length > MAX_IMAGES)
          throw Error("imageError");
        const converted = [];
        try {
          for (const f of files) {
            const blob = await db.compressPhoto(f);
            converted.push({ blob, url: URL.createObjectURL(blob) });
          }
          formImages.push(...converted);
          showUploads();
        } catch (e) {
          converted.forEach((p) => URL.revokeObjectURL(p.url));
          throw e;
        } finally {
          el.value = "";
        }
      });
    }
  });
  root.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (busy) return;
    if (e.target.id === "hp-login") {
      const values = new FormData(e.target);
      await run(async () => {
        try {
          await db.signIn(values.get("email"), values.get("password"));
        } catch (error) {
          q("#hp-login-error").textContent = t(
            error.message === "notAdmin" ? "notAdmin" : "authError",
          );
          return;
        }
        admin = true;
        owner = await db.isOwner();
        await refresh();
        view = "admin";
        render();
      });
    }
    if (e.target.id === "hp-password-setup") {
      const values = new FormData(e.target);
      await run(async () => {
        try {
          await db.updatePassword(values.get("password"));
          passwordSetup = false;
          history.replaceState(null, "", "?admin");
          render();
          notify(t("passwordSaved"));
        } catch {
          q("#hp-password-error").textContent = t("error");
        }
      });
    }
    if (e.target.id === "hp-review-form") {
      const values = new FormData(e.target),
        review = {
          ...Object.fromEntries(values),
          id: editReviewId,
          rating: Number(values.get("rating")),
          is_published: values.get("is_published") === "true",
        };
      await run(async () => {
        await db.saveReview(review, reviewImage);
        if (reviewImage && typeof reviewImage !== "string")
          URL.revokeObjectURL(reviewImage.url);
        reviewImage = null;
        editReviewId = null;
        await refresh();
        view = "reviews";
        history.replaceState(null, "", "?admin=reviews");
        render();
        notify(t("saved"));
      });
    }
    if (e.target.id === "hp-form") {
      const values = new FormData(e.target),
        d = Object.fromEntries(values),
        p = {
          ...d,
          id: editId,
          cat: Number(d.cat),
          price: Number(d.price),
          status: Number(d.status),
          quantity: Number(d.quantity),
          purposes: values.getAll("purposes").join(","),
          benefits: values.getAll("benefits").join(","),
          bundles: values.getAll("bundles").join(","),
        };
      await run(async () => {
        await db.saveProduct(p, formImages);
        clearPictures();
        await refresh();
        view = "admin";
        render();
        notify(t("saved"));
      });
    }
  });
  async function initialize() {
    loading = true;
    loadError = false;
    render();
    try {
      if (db.ready) {
        await db.connect();
        admin = await db.isAdmin();
        if (admin) owner = await db.isOwner();
        await refresh();
        if (view === "activity" && owner) {
          auditRows = await db.listAudit();
        }
        if (initialParams.has("product")) view = "detail";
        if (view === "stats" && admin) {
          statsLoading = true;
          try {
            analyticsEvents = await db.listAnalytics(statsRange);
          } catch {
            statsError = true;
          } finally {
            statsLoading = false;
          }
        }
      }
    } catch {
      loadError = true;
    } finally {
      loading = false;
      render();
      if (!admin && adminRoute === null) {
        recordEvent("page_view");
        if (view === "detail") recordEvent("product_view", selected);
      }
    }
  }
  window.addEventListener("beforeunload", (e) => {
    if (view === "edit") {
      e.preventDefault();
      e.returnValue = "";
    }
  });
  initialize();
})();
