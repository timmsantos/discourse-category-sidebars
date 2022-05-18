import { ajax } from "discourse/lib/ajax";
import { createWidget } from "discourse/widgets/widget";
import { getOwner } from "discourse-common/lib/get-owner";
import { h } from "virtual-dom";
import PostCooked from "discourse/widgets/post-cooked";

function defaultSettings() {
  return {};
}

function parseSetups(raw) {
  const parsed = {};
  raw.split("|").forEach((setting) => {
    const [category, value] = setting.split(",").map((s) => s.trim());
    parsed[category] = parsed[category] || defaultSettings();
    parsed[category]["post"] = value;
  });
  return parsed;
}

function createSidebar(taxonomy) {
  console.log("taxonomy:" + JSON.stringify(setups[taxonomy]));
  const setup = setups[taxonomy];
  const post = [this.getPost(setup["post"])];

  document
    .querySelector("body")
    .classList.add("custom-sidebar", "sidebar-" + settings.sidebar_side);
  document
    .querySelector(".topic-list")
    .classList.add("with-sidebar", settings.sidebar_side);

  return h(
    "div.category-sidebar-contents " + ".category-sidebar-" + taxonomy,
    post
  );
}

const postCache = {};
const setups = parseSetups(settings.setup);

createWidget("category-sidebar", {
  tagName: "div.sticky-sidebar",

  init() {
    let sidebarWrapper =
      document.getElementsByClassName("category-sidebar")[0] || 0;
    let headerHeight =
      document.getElementsByClassName("d-header-wrap")[0].offsetHeight || 0;
    let sidebarTop = headerHeight + 20 + "px";
    let sidebarMaxHeight = "calc(100vh - " + (headerHeight + 40) + "px)";
    if (sidebarWrapper) {
      sidebarWrapper.style.maxHeight = sidebarMaxHeight;
      sidebarWrapper.style.top = sidebarTop;
    }
  },

  html() {

    const router = getOwner(this).lookup("router:main");
    const currentRouteParams = router.currentRoute.params;
    const isCategoryTopicList = currentRouteParams.hasOwnProperty(
      "category_slug_path_with_id"
    );
    const isTagList = currentRouteParams.hasOwnProperty(
        "tag_id"
    );

    console.log("current route params: " + router.currentRoute.currentRouteParams)
    
    if (window.location.pathname.indexOf('/g/') >= 0) {
        //const winPath = window.location.pathname.split('/g/');
        console.log("you're in a group");
    }
    //console.log("tag: " + isTagList + ", " + currentRouteParams.tag_id);
    //console.log("category: " + isCategoryTopicList + ", " + currentRouteParams.category_slug_path_with_id);

    if (setups["all"] && !isCategoryTopicList && !isTagList) {
      return createSidebar.call(this, "all");
    } else if (isCategoryTopicList) {
      const categorySlugPath =
        currentRouteParams.category_slug_path_with_id.split("/");
      const categorySlug = categorySlugPath[0];
      const subcategorySlug = categorySlugPath[categorySlugPath.length - 2];
    //   console.log("categorySlug: " + categorySlug);
    //   console.log("split: " + currentRouteParams.category_slug_path_with_id.split("/"));
      // If set, show category sidebar

      if (categorySlug && !subcategorySlug && setups[categorySlug]) {
        return createSidebar.call(this, categorySlug);
      }

      // If set, show subcategory sidebar

      if (subcategorySlug && setups[subcategorySlug]) {
        return createSidebar.call(this, subcategorySlug);
      }

      // if set, subcategory without its own sidebar will inherit parent category's sidebar

      if (
        subcategorySlug &&
        !setups[subcategorySlug] &&
        setups[categorySlug] &&
        settings.inherit_parent_sidebar
      ) {
        return createSidebar.call(this, categorySlug);
      }
    } else if (isTagList && settings.enable_for_tags && setups[currentRouteParams.tag_id]) {
      const tagSlug = currentRouteParams.tag_id;
      return createSidebar.call(this, tagSlug);
    } 

    // Remove classes if no sidebar returned
    document
      .querySelector("body")
      .classList.remove("custom-sidebar", "sidebar-" + settings.sidebar_side);
    document
      .querySelector(".topic-list")
      .classList.remove("with-sidebar", settings.sidebar_side);
  },

  getPost(id) {
    if (!postCache[id]) {
      ajax(`/t/${id}.json`).then((response) => {
        postCache[id] = new PostCooked({
          cooked: response.post_stream.posts[0].cooked,
        });
        this.scheduleRerender();
      });
    }
    return postCache[id];
  },
});
