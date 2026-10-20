export const DESK_SORT_OPTIONS = [
  { id: "newest", label: "Newest first" },
  { id: "oldest", label: "Oldest first" },
];

export function sortByRecency(list = [], sort = "newest", getTime = defaultTime) {
  const next = [...list];
  next.sort((a, b) => {
    const left = getTime(a);
    const right = getTime(b);
    return sort === "oldest" ? left - right : right - left;
  });
  return next;
}

function defaultTime(item) {
  return Number(item?.updatedAt || item?.createdAt || item?.deletedAt || item?.floatingPriority || 0);
}

export function recordRecency(item) {
  const editionYear = Number(item?.editions?.[0]?.year || 0);
  return Number(item?.updatedAt || item?.createdAt || item?.deletedAt || 0) || (editionYear * 100000);
}
