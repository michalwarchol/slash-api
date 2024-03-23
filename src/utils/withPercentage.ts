export default (search: string): string => {
  let newSearch = search;

  if (newSearch[0] !== '%') {
    newSearch = '%' + newSearch;
  }

  if (newSearch[newSearch.length - 1] !== '%') {
    newSearch = newSearch + '%';
  }

  return newSearch;
};
