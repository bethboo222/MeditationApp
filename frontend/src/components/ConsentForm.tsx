import { useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Check } from 'lucide-react';

interface ConsentFormProps {
  onConsent: () => void;
}

export function ConsentForm({ onConsent }: ConsentFormProps) {
  const [consent1, setConsent1] = useState(false);
  const [consent2, setConsent2] = useState(false);
  const [consent3, setConsent3] = useState(false);

  const allConsented = consent1 && consent2 && consent3;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (allConsented) {
      onConsent();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <div className="w-full max-w-4xl">
        <Card className="p-8 md:p-12 backdrop-blur-sm bg-white/90 border-0 shadow-xl max-h-[90vh] overflow-y-auto">
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Research Study Consent Form
              </h1>
              <p className="text-gray-600">
                Trinity College Dublin - Final Year Research Project
              </p>
            </div>

            <div className="space-y-6 text-gray-700">
              <section>
                <h2 className="text-xl font-semibold mb-3 text-gray-900">
                  What is this study about?
                </h2>
                <p className="leading-relaxed">
                  You are invited to take part in a final year research project at Trinity College Dublin.
                  The project explores how people experience short guided meditations and how well these meditations meet their needs.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3 text-gray-900">
                  What will I be asked to do?
                </h2>
                <p className="leading-relaxed mb-2">
                  If you agree to take part, you will:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Listen to a short guided meditation.</li>
                  <li>Answer some brief questions about your experience.</li>
                </ul>
                <p className="leading-relaxed mt-2">
                  <strong>Total time: 25-30 minutes.</strong>
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3 text-gray-900">
                  Do I have to take part?
                </h2>
                <p className="leading-relaxed">
                  No. Taking part is completely voluntary.
                </p>
                <ul className="list-disc list-inside space-y-1 ml-4 mt-2">
                  <li>You may stop the meditation or exit the survey at any time, without giving a reason.</li>
                  <li>You can skip any question you do not wish to answer.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3 text-gray-900">
                  Are there any risks or discomforts?
                </h2>
                <p className="leading-relaxed mb-2">
                  The meditation is designed to be gentle and relaxing.
                </p>
                <p className="leading-relaxed mb-2">
                  Some people may feel emotional, uncomfortable, or restless when focusing on their thoughts or body.
                </p>
                <p className="leading-relaxed mb-2">
                  If at any point you feel uncomfortable, you should stop the meditation and/or close the survey.
                </p>
                <p className="leading-relaxed font-medium text-gray-900">
                  This study is not a form of medical, psychological, or therapeutic treatment.
                  If you have current mental health difficulties or are in crisis, you should seek support from a qualified professional or appropriate support service instead of relying on this study.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3 text-gray-900">
                  Are there any benefits?
                </h2>
                <p className="leading-relaxed mb-2">
                  There may be no direct personal benefit to you.
                </p>
                <p className="leading-relaxed">
                  You may find the meditation relaxing or interesting, and your responses will help improve future meditation design and research.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3 text-gray-900">
                  Data, privacy and confidentiality
                </h2>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>The survey will not ask for your name or contact details.</li>
                  <li>We may collect general background information (e.g. age range, meditation experience).</li>
                  <li>Your responses will be stored securely on password‑protected systems and used only for academic research purposes.</li>
                  <li>Only the researcher and supervisor will have access to the data.</li>
                  <li>Results may be reported in anonymised form (e.g. in a dissertation or presentations). Individual participants will not be identifiable.</li>
                  <li>You can withdraw from the study at any time by closing the page.
                    Once you submit your responses, they may be combined with others and anonymised, which may mean it is no longer possible to remove your individual data.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3 text-gray-900">
                  Who can take part?
                </h2>
                <p className="leading-relaxed mb-2">
                  By continuing, you confirm that:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>You are 18 years of age or older.</li>
                  <li>You are able to understand written English.</li>
                  <li>You are not driving, operating machinery, or doing anything that requires your full attention while listening to the meditation.</li>
                  <li>You are not currently in a mental health crisis and understand this is a research study, not a therapy.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3 text-gray-900">
                  Contact
                </h2>
                <p className="leading-relaxed">
                  If you have questions about the study, you may contact the student researcher or supervisor (details provided in the Participant Information Leaflet for this study).
                </p>
              </section>

              <section className="border-t pt-6">
                <h2 className="text-xl font-semibold mb-4 text-gray-900">
                  Consent
                </h2>
                <p className="text-sm text-gray-600 mb-4">
                  Please indicate your choice before proceeding.
                </p>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <div className="relative flex-shrink-0 mt-0.5">
                      <input
                        type="checkbox"
                        checked={consent1}
                        onChange={(e) => setConsent1(e.target.checked)}
                        className="sr-only"
                      />
                      <div className={`w-5 h-5 border-2 rounded flex items-center justify-center transition-all ${
                        consent1 
                          ? 'bg-indigo-600 border-indigo-600' 
                          : 'border-gray-300 group-hover:border-indigo-400'
                      }`}>
                        {consent1 && <Check className="w-4 h-4 text-white" />}
                      </div>
                    </div>
                    <span className="text-gray-700 leading-relaxed">
                      I confirm that I have read and understood the information above.
                    </span>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer group">
                    <div className="relative flex-shrink-0 mt-0.5">
                      <input
                        type="checkbox"
                        checked={consent2}
                        onChange={(e) => setConsent2(e.target.checked)}
                        className="sr-only"
                      />
                      <div className={`w-5 h-5 border-2 rounded flex items-center justify-center transition-all ${
                        consent2 
                          ? 'bg-indigo-600 border-indigo-600' 
                          : 'border-gray-300 group-hover:border-indigo-400'
                      }`}>
                        {consent2 && <Check className="w-4 h-4 text-white" />}
                      </div>
                    </div>
                    <span className="text-gray-700 leading-relaxed">
                      I understand that my participation is voluntary and that I can withdraw at any time before submitting my responses.
                    </span>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer group">
                    <div className="relative flex-shrink-0 mt-0.5">
                      <input
                        type="checkbox"
                        checked={consent3}
                        onChange={(e) => setConsent3(e.target.checked)}
                        className="sr-only"
                      />
                      <div className={`w-5 h-5 border-2 rounded flex items-center justify-center transition-all ${
                        consent3 
                          ? 'bg-indigo-600 border-indigo-600' 
                          : 'border-gray-300 group-hover:border-indigo-400'
                      }`}>
                        {consent3 && <Check className="w-4 h-4 text-white" />}
                      </div>
                    </div>
                    <span className="text-gray-700 leading-relaxed">
                      I agree to take part in this study and for my anonymised data to be used for research purposes.
                    </span>
                  </label>

                  <div className="pt-4">
                    <Button
                      type="submit"
                      disabled={!allConsented}
                      className="w-full h-12 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Continue to Study
                    </Button>
                  </div>
                </form>
              </section>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
