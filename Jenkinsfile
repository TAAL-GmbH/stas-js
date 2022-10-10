
pipeline {
    agent any

    stages {
        stage('Install Dependencies') {
            steps {
                echo 'Installing Dependencies..'
                sh 'npm install'
            }
        }
        stage('Unit Tests') {
            steps {
                echo 'Unit Test'
                sh 'API_USERNAME=taal_private API_PASSWORD=dotheT@@l007 npm run test:unit:ci'  
            }
        }
          stage('Functional Tests') {
            steps {
                echo 'Functional Tests'
                sh 'API_USERNAME=taal_private API_PASSWORD=dotheT@@l007 npm run test:functional:ci --detectOpenHandles'        
            }
        }
    }
    post {
            always {
                    allure includeProperties: false, jdk: '', results: [[path: 'allure-results']]
                    cleanWs()
                }

        }
}