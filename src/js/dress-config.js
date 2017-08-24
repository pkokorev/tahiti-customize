(function (ng) {
    'use strict';

    function calculateTotalPrice(criteria) {
        if (criteria) {
            switch (criteria.size) {
                case 's':
                    return 100;
                case 'm':
                    return 200;
                case 'l':
                    return 300;
                default:
                    return 0;
            }
        } else {
            return 0;
        }
    }

    ng.module('DressConfigApp', ['ngAnimate'])
        .controller('DressConfigCtrl', ['$scope', function (scope) {
            scope.sizeId = 'l';
            scope.total = {
                scope: 0,
                currency: '€'
            };
            scope.lists = {
                "sizes": [
                    {
                        "id": "s",
                        "label": "S"
                    },
                    {
                        "id": "m",
                        "label": "M"
                    },
                    {
                        "id": "l",
                        "label": "L"
                    }
                ]
            };

            scope.$watch('sizeId', function (value) {
                scope.total.amount = calculateTotalPrice({
                    size: value
                });
            });
        }])
        .directive('tahitiRadioGroup', [function () {
            return {
                restrict: 'E',
                require: 'ngModel',
                scope: {
                    id: '@',
                    captionTitle: '@',
                    captionIcon: '@',
                    items: '=',
                    ngModel: '='
                },
                templateUrl: '/tahiti-radio-group.html',
                link: function (scope, element, attrs, ngModel) {
                    scope.local = {
                        selectedId: scope.ngModel
                    };
                    if (!scope.local.selectedId && scope.items && scope.items.length) {
                        ngModel.$setViewValue(scope.items[0].id);
                    }
                    scope.handleChange = function (selectedId) {
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
            }
        }]);

})(angular);
