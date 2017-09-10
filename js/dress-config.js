(function (ng) {
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

    function preLoadImages(images) {
        function handleImage(event) {
            event.target.remove();
        }

        ng.forEach(images, function (image) {
            var newImage = new Image();

            newImage.onload = handleImage;
            newImage.onerror = handleImage;
            newImage.src = image;
        });
    }

    ng.module('DressConfigApp', ['ngAnimate'])
        .constant('COCKPIT_ROOT', 'https://brandizi.fr/dress/cockpit')
        .config(['$sceDelegateProvider', 'COCKPIT_ROOT', function (sceDelegateProvider, root) {
            sceDelegateProvider.resourceUrlWhitelist(['self', root + '/**']);
        }])
        .factory('$dataFactory', ['$timeout', '$http', '$log', 'COCKPIT_ROOT', function (timeout, http, log, root) {
            var cockpitApiRoot = root + '/api',
                token = '3c986fd55b6bace75ceba33d78b019';
            var db = {};
            return {
                loadData: function (name, callback) {
                    http({
                        method: 'GET',
                        url: cockpitApiRoot + '/collections/get/' + name,
                        params: {
                            token: token
                        }
                    }).then(function (result) {
                        if (ng.isObject(result.data) && ng.isArray(result.data.entries)) {
                            db[name] = mapById(result.data.entries, 'id');
                            timeout(function () {
                                callback(result.data.entries);
                            });
                        } else {
                            log.error('Invalid response object structure', result);
                        }
                    }, function (error) {
                        log.error('Error loading collection : ' + name, error);
                    });
                },
                loadFragment: function (name, callback) {
                    http({
                        method: 'GET',
                        url: cockpitApiRoot + '/regions/data/' + name,
                        params: {
                            token: token
                        }
                    }).then(function (result) {
                        callback(result.data);
                    }, function (error) {
                        log.error('Error loading region : ' + name, error);
                    });
                },
                db: function () {
                    return db;
                }
            };
        }])
        .controller('DressConfigCtrl', ['$scope', '$dataFactory', '$sce', '$log', function (scope, dataFactory, sce, log) {
            scope.criteria = {
                sizeId: '2_medium',
                deliveryId: '1_d',
                crafted: 'true',
                loaded: false
            };
            scope.total = {
                scope: 0,
                currency: 'Fr'
            };
            scope.lists = {
                sizes: [],
                models: [],
                tissues: [],
                laces: [],
                flowers: [],
                deliveries: []
            };
            scope.toggle = {
                sizesDescription: false
            };
            scope.description = {
                html: '',
                getHtml: function () {
                    return sce.trustAsHtml(scope.description.html);
                }
            };

            (function (dataLists, loadedLists) {
                ng.forEach(dataLists, function (dataList) {
                    dataFactory.loadData(dataList, function (results) {
                        copyArray(results, scope.lists[dataList]);
                        loadedLists.push(dataList);
                        if (Object.keys(dataLists).length === loadedLists.length) {
                            scope.$watch('criteria', function (value) {
                                scope.total.amount = calculateTotalPrice(dataFactory.db(), value || {}, log).total;
                            }, true);
                            scope.criteria.loaded = true;
                        }
                    });
                });
            })(['sizes', 'models', 'tissues', 'laces', 'flowers', 'deliveries'], []);
            (function (documentFragments) {
                ng.forEach(documentFragments, function (documentFragment) {
                    dataFactory.loadFragment(documentFragment, function (data) {
                        scope.description.html = data.description;
                    });
                });
            })(['configuration']);
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
        .directive('tahitiRadioGroup', ['$sce', 'COCKPIT_ROOT', function (sce, root) {
            var cockpitUploadsRoot = root + '/storage/uploads';
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
                    scope.local = {
                        items: scope.items,
                        selectedId: scope.ngModel,
                        desktopLayout: scope.desktopLayout === 'horizontal' ? scope.desktopLayout : 'vertical',
                        mobileLayout: scope.mobileLayout === 'vertical' ? scope.mobileLayout : 'horizontal',
                        tiles: !!scope.tiles
                    };
                    scope.imageUrl = function (path) {
                        return sce.getTrustedResourceUrl(cockpitUploadsRoot + path);
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
        .directive('tahitiDressSlider', ['$sce', 'COCKPIT_ROOT', function (sce, root) {
            var cockpitUploadsRoot = root + '/storage/uploads';
            return {
                restrict: 'E',
                scope: {
                    criteria: '=',
                    initialVariant: '@',
                    tissues: '=',
                    sizes: '=',
                    models: '='
                },
                templateUrl: '/tahiti-dress-slider.html',
                link: function (scope) {

                    function calculateShape(sizeId) {
                        var sizes = mapById(scope.sizes, 'id'),
                            models = mapById(scope.models, 'id'),
                            size = sizes[sizeId],
                            model = size ? size.model : null,
                            modelId = model ? model.display : null;
                        return models[modelId];
                    }

                    var model = null,
                        variant = scope.initialVariant;

                    scope.getVariant = function () {
                        return variant;
                    };
                    scope.rotate = function () {
                        variant = variant === 'front' ? 'back' : 'front';
                    };
                    scope.modelImageUrl = function () {
                        if (model) {
                            var dressed = !!scope.criteria.tissueId ? 'dressed' : 'naked',
                                imageKey = variant + '-' + dressed;
                            return sce.getTrustedResourceUrl(cockpitUploadsRoot + model[imageKey].path);
                        } else {
                            return null;
                        }
                    };
                    scope.canvasImageUrl = function (path) {
                        return sce.getTrustedResourceUrl(cockpitUploadsRoot + path);
                    };

                    scope.$watch('criteria', function (criteria) {
                        model = calculateShape(criteria.sizeId);
                    }, true);
                    scope.$watch('models', function (models) {
                        var images = [];
                        ng.forEach(models, function (model) {
                            ng.forEach(['front-dressed', 'front-naked', 'back-dressed', 'back-naked'], function (key) {
                                images.push(cockpitUploadsRoot + model[key].path);
                            });
                        });
                        preLoadImages(images);
                    }, true);
                    scope.$watch('tissues', function (tissues) {
                        var images = [];
                        ng.forEach(tissues, function (tissue) {
                            images.push(cockpitUploadsRoot + tissue.canvas.path);
                        });
                        preLoadImages(images);
                    });
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
        }]);

})(angular);
