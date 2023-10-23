export const config = {
  connector: {
    // 3-32 characters
    id: 'foodstore',
    name: 'Food store',
    description: '',
    activitySettings: {
      urlToItemResolvers: [
        {
          '@odata.type': '#microsoft.graph.externalConnectors.itemIdResolver',
          urlMatchInfo: {
            baseUrls: [
              'https://world.openfoodfacts.org'
            ],
            urlPattern: '/product/(?<productId>[^/]+)/.*'
          },
          itemId: '{productId}',
          priority: 1
        }
      ]
    },
    searchSettings: {
      searchResultTemplates: [
        {
          id: 'foodstore',
          priority: 1,
          layout: {}
        }
      ]
    },
    // https://learn.microsoft.com/graph/connecting-external-content-manage-schema
    schema: [
      {
        name: 'title',
        type: 'String',
        isQueryable: 'true',
        isSearchable: 'true',
        isRetrievable: 'true',
        labels: [
          'title'
        ]
      },
      {
        name: 'excerpt',
        type: 'String',
        isQueryable: 'true',
        isSearchable: 'true',
        isRetrievable: 'true'
      },
      {
        name: 'imageUrl',
        type: 'String',
        isRetrievable: 'true'
      },
      {
        name: 'url',
        type: 'String',
        isRetrievable: 'true',
        labels: [
          'url'
        ]
      },
      {
        name: 'date',
        type: 'DateTime',
        isQueryable: 'true',
        isRetrievable: 'true',
        isRefinable: 'true',
        labels: [
          'lastModifiedDateTime'
        ]
      },
      {
        name: 'tags',
        type: 'StringCollection',
        isQueryable: 'true',
        isRetrievable: 'true',
        isRefinable: 'true'
      }
    ]
  }
};