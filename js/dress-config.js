(function (ng, papa) {
    'use strict';

    function calculateTotalPrice(db, criteria, log) {
        if (!criteria || !criteria.sizeId) {
            return 0;
        }
        var size = db.sizes[criteria.sizeId];
        var cost = {
            tissueCost: criteria.tissueId ? (size.tissueFactor || 0) * (db.tissues[criteria.tissueId].price || 0) : 0,
            laceworkCost: criteria.laceId ? (size.laceworkFactor || 0) * (db.laces[criteria.laceId].price || 0) : 0,
            flowerCost: criteria.flowerId ? (size.flowerFactor || 0) * (db.flowers[criteria.flowerId].price || 0) : 0,
            deliveryCost: criteria.deliveryId ? (db.deliveries[criteria.deliveryId].price || 0) : 0,
            threadCost: size.threadPrice || 0,
            elasticCost: size.elasticPrice || 0,
            nacreCost: size.nacrePrice || 0,
            craftingCost: criteria.crafted === 'true' ? size.craftingPrice || 0 : 0,
            cartonCost: criteria.crafted === 'false' ? size.cartonPrice || 0 : 0
        };

        cost.total = cost.tissueCost + cost.laceworkCost + cost.flowerCost
            + cost.deliveryCost
            + cost.threadCost + cost.elasticCost + cost.nacreCost
            + cost.craftingCost + cost.cartonCost;

        if (log) {
            log.info('Calculated cost', cost);
        }

        return cost;
    }

    function mapById(array, idProperty) {
        return (function (map) {
            if (ng.isArray(array)) {
                array.forEach(function (item) {
                    if (item && item.hasOwnProperty(idProperty)) {
                        map[item[idProperty]] = item;
                    }
                });
            }
            return map;
        })({});
    }

    function copyArray(from, to) {
        if (ng.isArray(from) && ng.isArray(to)) {
            from.forEach(function (item) {
                to.push(item);
            });
        }
    }

    ng.module('DressConfigApp', ['ngAnimate'])
        .factory('$dataFactory', ['$timeout', function (timeout) {
            var db = {};
            return {
                loadData: function (name, callback) {
                    papa.parse('data/' + name + '.csv', {
                        download: true,
                        header: true,
                        dynamicTyping: true,
                        complete: function (results) {
                            db[name] = mapById(results.data, 'id');
                            timeout(function () {
                                callback(results);
                            });
                        }
                    });
                },
                db: function () {
                    return db;
                }
            };
        }])
        .controller('DressConfigCtrl', ['$scope', '$dataFactory', '$log', function (scope, dataFactory, log) {
            scope.criteria = {
                sizeId: '2_medium',
                tissueId: '3_t',
                laceId: '5_l',
                flowerId: '6_f',
                deliveryId: '4_d',
                crafted: 'true'
            };
            scope.total = {
                scope: 0,
                currency: 'Fr'
            };
            scope.lists = {
                sizes: [],
                tissues: [],
                laces: [],
                flowers: [],
                deliveries: []
            };
            scope.toggle = {
                sizesDescription: false
            };
            scope.description =
                'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Quisque iaculis leo feugiat sem porta ' +
                'malesuada non sed urna. Phasellus sapien libero, varius vestibulum libero id, condimentum ' +
                'pellentesque felis. Nullam lobortis urna augue, eu fringilla erat efficitur ultrices.';

            (function (dataLists, loadedLists) {
                dataLists.forEach(function (dataList) {
                    dataFactory.loadData(dataList, function (results) {
                        copyArray(results.data, scope.lists[dataList]);
                        loadedLists.push(dataList);
                        if (dataLists.length === loadedLists.length) {
                            scope.$watch('criteria', function (value) {
                                scope.total.amount = calculateTotalPrice(dataFactory.db(), value || {}, log).total;
                            }, true);
                        }
                    });
                });
            })(['sizes', 'tissues', 'laces', 'flowers', 'deliveries'], []);
        }])
        .directive('tahitiCaption', [function () {
            return {
                restrict: 'E',
                scope: {
                    captionTitle: '@',
                    captionIcon: '@?',
                    toggleObject: '=?',
                    toggleKey: '@?'
                },
                templateUrl: '/tahiti-caption.html',
                link: function (scope) {
                    scope.hasToggle = function () {
                        return scope.toggleObject && scope.toggleKey;
                    };
                    scope.toggle = function () {
                        scope.toggleObject[scope.toggleKey] = !scope.toggleObject[scope.toggleKey];
                    };
                }
            };
        }])
        .directive('tahitiRadioGroup', [function () {
            return {
                restrict: 'E',
                require: 'ngModel',
                scope: {
                    id: '@',
                    captionTitle: '@',
                    captionIcon: '@?',
                    toggleObject: '=?',
                    toggleKey: '@?',
                    desktopLayout: '@?',
                    mobileLayout: '@?',
                    tiles: '@?',
                    items: '=',
                    ngModel: '='
                },
                templateUrl: '/tahiti-radio-group.html',
                link: function (scope, element, attrs, ngModel) {
                    window.console.log('Toggle', scope.toggleObject, scope.toggleKey);
                    scope.local = {
                        items: scope.items,
                        selectedId: scope.ngModel,
                        desktopLayout: scope.desktopLayout === 'horizontal' ? scope.desktopLayout : 'vertical',
                        mobileLayout: scope.mobileLayout === 'vertical' ? scope.mobileLayout : 'horizontal',
                        tiles: !!scope.tiles
                    };
                    scope.handleChange = function (selectedId) {
                        scope.local.selectedId = selectedId;
                        ngModel.$setViewValue(selectedId);
                    };
                }
            };
        }])
        .directive('tahitiTotalPrice', ['$timeout', '$animate', function (timeout, animate) {
            return {
                restrict: 'E',
                scope: {
                    total: '='
                },
                templateUrl: '/tahiti-total-price.html',
                link: function (scope, element) {
                    scope.$watch('total', function (newVal, oldVal) {
                        if (newVal.amount && oldVal.amount && newVal.amount !== oldVal.amount) {
                            animate.addClass(element, 'tahiti-total-price--highlighted').then(function () {
                                timeout(function () {
                                    animate.removeClass(element, 'tahiti-total-price--highlighted');
                                }, 250);
                            });
                        }
                    }, true);
                }
            };
        }])
        .directive('tahitiDropdownSelect', [function () {
            return {
                restrict: 'E',
                require: 'ngModel',
                scope: {
                    id: '@',
                    captionTitle: '@',
                    captionIcon: '@?',
                    large: '@',
                    items: '=',
                    ngModel: '='
                },
                templateUrl: '/tahiti-dropdown-select.html',
                link: function (scope, element, attrs, ngModel) {
                    scope.local = {
                        items: scope.items,
                        selectedId: scope.ngModel,
                        selectedLabel: function () {
                            var localItemsMap = mapById(scope.local.items, 'id') || {};
                            var selectedItem = localItemsMap[scope.local.selectedId] || {};
                            return selectedItem.label || '';
                        }
                    };
                    scope.selectOption = function () {
                        ngModel.$setViewValue(scope.local.selectedId);
                    }
                }
            };
        }])
        .directive('tahitiDressSlider', [function () {
            return {
                restrict: 'E',
                scope: {
                    criteria: '=',
                    initialVariant: '@',
                    tissues: '='
                },
                templateUrl: '/tahiti-dress-slider.html',
                link: function (scope) {

                    function calculateShape(sizeId) {
                        if (['1_small', '2_medium'].indexOf(sizeId) >= 0) {
                            return 'skinny';
                        } else {
                            return 'round';
                        }
                    }

                    var shape = calculateShape(scope.criteria.sizeId),
                        variant = scope.initialVariant;

                    scope.getShape = function () {
                        return shape;
                    };
                    scope.getVariant = function () {
                        return variant;
                    };
                    scope.rotate = function () {
                        variant = variant === 'front' ? 'back' : 'front';
                    };

                    scope.$watch('criteria', function (criteria) {
                        shape = calculateShape(criteria.sizeId);
                    }, true);
                }
            };
        }])
        .directive('tahitiSizesDescription', ['$animate', function (animate) {
            return {
                restrict: 'E',
                scope: {
                    sizes: '=',
                    toggle: '='
                },
                templateUrl: '/tahiti-sizes-description.html',
                link: function (scope, element) {
                    scope.$watch('toggle', function (toggle) {
                        if (toggle.sizesDescription) {
                            animate.removeClass(element, 'tahiti-sizes-description--off');
                        } else {
                            animate.addClass(element, 'tahiti-sizes-description--off');
                        }
                    }, true);
                }
            };
        }])
        .directive('initialLoader', [function () {
            return {
                restrict: 'E',
                scope: {},
                link: function (scope, element, attrs) {
                    ng.forEach(attrs, function (value, key) {
                        if (key.indexOf('preloadImg') >= 0) {
                            var newImage = new Image();

                            newImage.onload = handle;
                            newImage.onerror = handle;
                            newImage.src = value;
                        }
                    });

                    function handle() {
                        event.target.remove();
                    }
                }
            };
        }]);

})(angular, Papa);
