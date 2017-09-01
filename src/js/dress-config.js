(function (ng, papa) {
    'use strict';

    function calculateTotalPrice(db, criteria) {
        var tissueCost = db.sizes[criteria.sizeId].tissueFactor * db.tissues[criteria.tissueId].price;
        var laceworkCost = db.sizes[criteria.sizeId].laceworkFactor * db.laces[criteria.laceId].price;
        var flowerCost = db.sizes[criteria.sizeId].flowerFactor * db.flowers[criteria.flowerId].price;
        var deliveryCost = db.deliveries[criteria.deliveryId].price;
        return tissueCost + laceworkCost + flowerCost + deliveryCost;
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
            return {
                loadData: function (name, callback) {
                    papa.parse('data/' + name + '.csv', {
                        download: true,
                        header: true,
                        dynamicTyping: true,
                        complete: function (results) {
                            timeout(function () {
                                callback(results);
                            });
                        }
                    });
                }
            };
        }])
        .controller('DressConfigCtrl', ['$scope', '$dataFactory', function (scope, dataFactory) {
            var db = {};

            scope.criteria = {
                sizeId: '2_medium',
                tissueId: '3_t',
                laceId: '5_l',
                flowerId: '6_f',
                deliveryId: '4_d'
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

            (function (dataLists, loadedLists) {
                dataLists.forEach(function (dataList) {
                    dataFactory.loadData(dataList, function (results) {
                        db[dataList] = mapById(results.data, 'id');
                        copyArray(results.data, scope.lists[dataList]);
                        loadedLists.push(dataList);
                        if (dataLists.length === loadedLists.length) {
                            scope.$watch('criteria', function (value) {
                                scope.total.amount = calculateTotalPrice(db, value || {});
                            }, true);
                        }
                    });
                });
            })(['sizes', 'tissues', 'laces', 'flowers', 'deliveries'], []);
        }])
        .directive('tahitiRadioGroup', [function () {
            return {
                restrict: 'E',
                require: 'ngModel',
                scope: {
                    id: '@',
                    captionTitle: '@',
                    captionIcon: '@?',
                    desktopLayout: '@?',
                    mobileLayout: '@?',
                    tiles: '@?',
                    items: '=',
                    ngModel: '='
                },
                templateUrl: '/tahiti-radio-group.html',
                link: function (scope, element, attrs, ngModel) {
                    scope.local = {
                        items: scope.items,
                        selectedId: scope.ngModel,
                        desktopLayout: scope.desktopLayout === 'horizontal' ? scope.desktopLayout : 'vertical',
                        mobileLayout: scope.mobileLayout === 'horizontal' ? scope.mobileLayout : 'vertical',
                        tiles: !!scope.tiles
                    };
                    scope.handleChange = function (selectedId) {
                        scope.local.selectedId = selectedId;
                        ngModel.$setViewValue(selectedId);
                    };
                }
            };
        }])
        .directive('tahitiTotalPrice', [function () {
            return {
                restrict: 'E',
                scope: {
                    total: '='
                },
                templateUrl: '/tahiti-total-price.html'
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
                    items: '=',
                    ngModel: '='
                },
                templateUrl: '/tahiti-dropdown-select.html',
                link: function (scope, element, attrs, ngModel) {
                    scope.local = {
                        items: scope.items,
                        selectedId: scope.ngModel
                    };
                    scope.selectOption = function () {
                        ngModel.$setViewValue(scope.local.selectedId);
                    }
                }
            };
        }]);

})(angular, Papa);
