import React from 'react';
import { CheckCircle, Home } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Footer } from '../components/Footer';

export function ComplianceSurveyComplete() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex flex-col">
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full text-center animate-fade-in">
          <div className="mb-8">
            <CheckCircle className="h-32 w-32 text-green-500 mx-auto animate-bounce" />
          </div>
          
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Survey Completed Successfully!
          </h1>
          
          <p className="text-xl text-gray-600 mb-8">
            Thank you for completing the compliance survey. Your responses have been recorded and will be reviewed by the legal team.
          </p>
          
          <div className="bg-white rounded-lg p-8 shadow-lg mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              What happens next?
            </h2>
            
            <div className="space-y-4 text-left">
              <div className="flex items-start">
                <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mr-3 mt-1">
                  <span className="text-green-600 text-sm font-bold">1</span>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Review Process</h3>
                  <p className="text-gray-600 text-sm">Your responses will be reviewed by the legal compliance team</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mr-3 mt-1">
                  <span className="text-green-600 text-sm font-bold">2</span>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Follow-up Actions</h3>
                  <p className="text-gray-600 text-sm">If any issues are identified, you may be contacted for additional information</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mr-3 mt-1">
                  <span className="text-green-600 text-sm font-bold">3</span>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Compliance Report</h3>
                  <p className="text-gray-600 text-sm">A summary report will be generated for management review</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <p className="text-gray-600">
              You can now close this window or return to your regular work.
            </p>
            
            <div className="flex justify-center space-x-4">
              <Link
                to="/"
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                <Home className="h-5 w-5 mr-2" />
                Return to Dashboard
              </Link>
            </div>
          </div>
          
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              If you have any questions about this survey or the compliance process, 
              please contact the legal department.
            </p>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <Footer />
    </div>
  );
}
