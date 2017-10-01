var Resume = angular.module("Resume", []);
Resume.controller("resumeController", function($scope, $http) {
    $http.get(RESUME_JSON_PATH)
        .success(function(response){
            $scope.resumeData = response;
            window.resumeData = response;
        });
});
