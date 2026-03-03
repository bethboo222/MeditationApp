import { useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { AlertCircle } from 'lucide-react';

interface QuestionnaireProps {
  onComplete: () => void;
}

export function Questionnaire({ onComplete }: QuestionnaireProps) {
  // Section A
  const [listenedAll, setListenedAll] = useState<string>('');
  const [stopReason, setStopReason] = useState('');

  // Section B - Experience ratings (1-5 scale)
  const [ratings, setRatings] = useState<Record<string, string>>({
    easyToFollow: '',
    comfortablePace: '',
    appropriateLength: '',
    pleasantVoice: '',
    pleasantBackground: '',
    feltCalmer: '',
    feltFocused: '',
    stayedEngaged: '',
    personallyRelevant: '',
    naturalWording: '',
    useAgain: '',
    recommend: '',
  });

  // Section C
  const [personalised, setPersonalised] = useState('');
  const [comfortableAI, setComfortableAI] = useState('');
  const [comparedToHuman, setComparedToHuman] = useState('');

  // Section D - Open feedback
  const [likedMost, setLikedMost] = useState('');
  const [likedLeast, setLikedLeast] = useState('');
  const [specificMoments, setSpecificMoments] = useState('');
  const [oneChange, setOneChange] = useState('');

  // Section E - Demographics
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [genderSelfDescribe, setGenderSelfDescribe] = useState('');
  const [meditationExperience, setMeditationExperience] = useState('');
  const [meditationAppUsage, setMeditationAppUsage] = useState('');
  const [additionalComments, setAdditionalComments] = useState('');

  const [showUnder18Message, setShowUnder18Message] = useState(false);

  const handleAgeChange = (value: string) => {
    setAge(value);
    if (value === 'under18') {
      setShowUnder18Message(true);
    } else {
      setShowUnder18Message(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if under 18
    if (age === 'under18') {
      return;
    }

    const formData = {
      sectionA: {
        listenedAll,
        stopReason: listenedAll === 'No' ? stopReason : '',
      },
      sectionB: ratings,
      sectionC: {
        personalised,
        comfortableAI,
        comparedToHuman,
      },
      sectionD: {
        likedMost,
        likedLeast,
        specificMoments,
        oneChange,
      },
      sectionE: {
        age,
        gender: gender === 'self-describe' ? genderSelfDescribe : gender,
        meditationExperience,
        meditationAppUsage,
        additionalComments,
      },
    };

    // Send to Google Sheets via Apps Script web app (silently)
    const sheetsUrl = import.meta.env.VITE_SHEETS_URL;
    if (sheetsUrl) {
      try {
        // no-cors bypasses the CORS block caused by Apps Script's redirect response
        await fetch(sheetsUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify(formData),
        });
      } catch (error) {
        console.error('Error saving questionnaire response:', error);
        // Continue anyway - don't show error to user
      }
    }
    
    // Proceed to next screen regardless of save result
    onComplete();
  };

  const RatingScale = ({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (value: string) => void }) => (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <RadioGroup value={value} onValueChange={onChange} className="flex flex-wrap gap-4">
        {[1, 2, 3, 4, 5].map((num) => (
          <div key={num} className="flex items-center space-x-2">
            <RadioGroupItem value={num.toString()} id={`${id}-${num}`} />
            <Label htmlFor={`${id}-${num}`} className="text-sm cursor-pointer">
              {num}
            </Label>
          </div>
        ))}
      </RadioGroup>
      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <span>Strongly disagree</span>
        <span>Strongly agree</span>
      </div>
    </div>
  );

  if (showUnder18Message) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
        <Card className="p-8 max-w-md backdrop-blur-sm bg-white/90 border-0 shadow-xl">
          <div className="text-center space-y-4">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto" />
            <h2 className="text-2xl font-bold text-gray-900">Thank you for your interest</h2>
            <p className="text-gray-700">
              Unfortunately, this study is only open to participants who are 18 years of age or older.
              Please do not complete this study.
            </p>
            <Button onClick={() => window.location.reload()} className="w-full">
              Exit Study
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <div className="max-w-4xl mx-auto py-8">
        <Card className="p-8 md:p-12 backdrop-blur-sm bg-white/90 border-0 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-10">
            {/* Intro */}
            <div className="space-y-4">
              <h1 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Post-Meditation Questionnaire
              </h1>
              <div className="text-gray-700 space-y-2">
                <p>
                  This survey asks about your experience of listening to a short guided meditation.
                </p>
                <p>
                  Your responses are anonymous and will be used for a Trinity College Dublin final‑year project on AI‑generated personalised meditations.
                </p>
                <p className="font-medium">
                  There are no right or wrong answers! I'm interested in your honest reactions.
                </p>
              </div>
            </div>

            {/* Section A */}
            <section className="space-y-6 border-t pt-8">
              <h2 className="text-2xl font-semibold text-gray-900">Section A – About this meditation</h2>
              
              <div className="space-y-4">
                <div>
                  <Label className="text-base font-medium mb-3 block">A1. Did you listen to the meditation all the way through?</Label>
                  <RadioGroup value={listenedAll} onValueChange={setListenedAll}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Yes" id="listened-yes" />
                      <Label htmlFor="listened-yes" className="cursor-pointer">Yes</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="No" id="listened-no" />
                      <Label htmlFor="listened-no" className="cursor-pointer">No</Label>
                    </div>
                  </RadioGroup>
                </div>

                {listenedAll === 'No' && (
                  <div>
                    <Label htmlFor="stop-reason" className="text-base font-medium mb-2 block">
                      A2. (If No) What made you stop? (optional)
                    </Label>
                    <textarea
                      id="stop-reason"
                      value={stopReason}
                      onChange={(e) => setStopReason(e.target.value)}
                      placeholder="Please describe..."
                      className="flex min-h-[80px] w-full max-w-2xl rounded-md border border-input bg-input-background px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                      rows={3}
                    />
                  </div>
                )}
              </div>
            </section>

            {/* Section B */}
            <section className="space-y-6 border-t pt-8">
              <h2 className="text-2xl font-semibold text-gray-900">Section B – Experience of the meditation</h2>
              <p className="text-sm text-gray-600">
                For the questions below, please rate how much you agree with each statement about the meditation you just listened to.
                <br />
                <strong>Scale: 1 = Strongly disagree, 2 = Disagree, 3 = Neither, 4 = Agree, 5 = Strongly agree</strong>
              </p>

              <div className="space-y-6">
                <RatingScale
                  id="easyToFollow"
                  label="The instructions in the meditation were easy to follow."
                  value={ratings.easyToFollow}
                  onChange={(value) => setRatings({ ...ratings, easyToFollow: value })}
                />
                <RatingScale
                  id="comfortablePace"
                  label="The pace of the meditation felt comfortable."
                  value={ratings.comfortablePace}
                  onChange={(value) => setRatings({ ...ratings, comfortablePace: value })}
                />
                <RatingScale
                  id="appropriateLength"
                  label="The length of the meditation felt appropriate."
                  value={ratings.appropriateLength}
                  onChange={(value) => setRatings({ ...ratings, appropriateLength: value })}
                />
                <RatingScale
                  id="pleasantVoice"
                  label="The voice used in the meditation was pleasant to listen to."
                  value={ratings.pleasantVoice}
                  onChange={(value) => setRatings({ ...ratings, pleasantVoice: value })}
                />
                <RatingScale
                  id="pleasantBackground"
                  label="Any background sound or music (if present) was pleasant and not distracting."
                  value={ratings.pleasantBackground}
                  onChange={(value) => setRatings({ ...ratings, pleasantBackground: value })}
                />
                <RatingScale
                  id="feltCalmer"
                  label="I felt calmer or more relaxed after the meditation."
                  value={ratings.feltCalmer}
                  onChange={(value) => setRatings({ ...ratings, feltCalmer: value })}
                />
                <RatingScale
                  id="feltFocused"
                  label="I felt more present / focused after the meditation."
                  value={ratings.feltFocused}
                  onChange={(value) => setRatings({ ...ratings, feltFocused: value })}
                />
                <RatingScale
                  id="stayedEngaged"
                  label="The meditation helped me stay engaged from start to finish."
                  value={ratings.stayedEngaged}
                  onChange={(value) => setRatings({ ...ratings, stayedEngaged: value })}
                />
                <RatingScale
                  id="personallyRelevant"
                  label="The content of the meditation felt personally relevant to me."
                  value={ratings.personallyRelevant}
                  onChange={(value) => setRatings({ ...ratings, personallyRelevant: value })}
                />
                <RatingScale
                  id="naturalWording"
                  label='The wording felt natural and not repetitive or "robotic".'
                  value={ratings.naturalWording}
                  onChange={(value) => setRatings({ ...ratings, naturalWording: value })}
                />
                <RatingScale
                  id="useAgain"
                  label="I would be happy to use this meditation again."
                  value={ratings.useAgain}
                  onChange={(value) => setRatings({ ...ratings, useAgain: value })}
                />
                <RatingScale
                  id="recommend"
                  label="I would recommend this meditation to a friend."
                  value={ratings.recommend}
                  onChange={(value) => setRatings({ ...ratings, recommend: value })}
                />
              </div>
            </section>

            {/* Section C */}
            <section className="space-y-6 border-t pt-8">
              <h2 className="text-2xl font-semibold text-gray-900">Section C – Perception of personalisation / AI</h2>
              
              <div className="space-y-6">
                <RatingScale
                  id="personalised"
                  label="It felt like this meditation was somewhat personalised to me."
                  value={personalised}
                  onChange={setPersonalised}
                />
                <RatingScale
                  id="comfortableAI"
                  label="I felt comfortable knowing this meditation was generated using AI."
                  value={comfortableAI}
                  onChange={setComfortableAI}
                />
                
                <div>
                  <Label className="text-base font-medium mb-3 block">
                    Compared to a typical human‑made meditation, this one felt…
                  </Label>
                  <RadioGroup value={comparedToHuman} onValueChange={setComparedToHuman}>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="much-worse" id="compare-much-worse" />
                        <Label htmlFor="compare-much-worse" className="cursor-pointer">Much worse</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="bit-worse" id="compare-bit-worse" />
                        <Label htmlFor="compare-bit-worse" className="cursor-pointer">A bit worse</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="same" id="compare-same" />
                        <Label htmlFor="compare-same" className="cursor-pointer">About the same</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="bit-better" id="compare-bit-better" />
                        <Label htmlFor="compare-bit-better" className="cursor-pointer">A bit better</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="much-better" id="compare-much-better" />
                        <Label htmlFor="compare-much-better" className="cursor-pointer">Much better</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="not-sure" id="compare-not-sure" />
                        <Label htmlFor="compare-not-sure" className="cursor-pointer">I'm not sure / I don't usually use meditations</Label>
                      </div>
                    </div>
                  </RadioGroup>
                </div>
              </div>
            </section>

            {/* Section D */}
            <section className="space-y-6 border-t pt-8">
              <h2 className="text-2xl font-semibold text-gray-900">Section D – Open feedback (optional but super useful)</h2>
              
              <div className="space-y-6">
                <div>
                  <Label htmlFor="liked-most" className="text-base font-medium mb-2 block">
                    What did you like most about this meditation?
                  </Label>
                  <textarea
                    id="liked-most"
                    value={likedMost}
                    onChange={(e) => setLikedMost(e.target.value)}
                    placeholder="Your thoughts..."
                    className="flex min-h-[80px] w-full max-w-2xl rounded-md border border-input bg-input-background px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="liked-least" className="text-base font-medium mb-2 block">
                    What did you like least or find unhelpful?
                  </Label>
                  <textarea
                    id="liked-least"
                    value={likedLeast}
                    onChange={(e) => setLikedLeast(e.target.value)}
                    placeholder="Your thoughts..."
                    className="flex min-h-[80px] w-full max-w-2xl rounded-md border border-input bg-input-background px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="specific-moments" className="text-base font-medium mb-2 block">
                    Were there any specific moments, words, or sections that didn't work well for you (e.g. strange wording, pacing, tone)?
                  </Label>
                  <textarea
                    id="specific-moments"
                    value={specificMoments}
                    onChange={(e) => setSpecificMoments(e.target.value)}
                    placeholder="Please describe..."
                    className="flex min-h-[80px] w-full max-w-2xl rounded-md border border-input bg-input-background px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="one-change" className="text-base font-medium mb-2 block">
                    If you could change one thing to improve this meditation, what would it be?
                  </Label>
                  <textarea
                    id="one-change"
                    value={oneChange}
                    onChange={(e) => setOneChange(e.target.value)}
                    placeholder="Your suggestion..."
                    className="flex min-h-[80px] w-full max-w-2xl rounded-md border border-input bg-input-background px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                    rows={3}
                  />
                </div>
              </div>
            </section>

            {/* Section E */}
            <section className="space-y-6 border-t pt-8">
              <h2 className="text-2xl font-semibold text-gray-900">Section E – About you (demographic & background – all optional)</h2>
              
              <div className="space-y-6">
                <div>
                  <Label className="text-base font-medium mb-3 block">Age</Label>
                  <RadioGroup value={age} onValueChange={handleAgeChange}>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="under18" id="age-under18" />
                        <Label htmlFor="age-under18" className="cursor-pointer">Under 18 (Please do not complete this study)</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="18-24" id="age-18-24" />
                        <Label htmlFor="age-18-24" className="cursor-pointer">18–24</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="25-34" id="age-25-34" />
                        <Label htmlFor="age-25-34" className="cursor-pointer">25–34</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="35-44" id="age-35-44" />
                        <Label htmlFor="age-35-44" className="cursor-pointer">35–44</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="45-54" id="age-45-54" />
                        <Label htmlFor="age-45-54" className="cursor-pointer">45–54</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="55-64" id="age-55-64" />
                        <Label htmlFor="age-55-64" className="cursor-pointer">55–64</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="65+" id="age-65" />
                        <Label htmlFor="age-65" className="cursor-pointer">65+</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="prefer-not-say-age" id="age-prefer-not-say" />
                        <Label htmlFor="age-prefer-not-say" className="cursor-pointer">Prefer not to say</Label>
                      </div>
                    </div>
                  </RadioGroup>
                </div>

                <div>
                  <Label className="text-base font-medium mb-3 block">Gender (optional)</Label>
                  <RadioGroup value={gender} onValueChange={setGender}>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="woman" id="gender-woman" />
                        <Label htmlFor="gender-woman" className="cursor-pointer">Woman</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="man" id="gender-man" />
                        <Label htmlFor="gender-man" className="cursor-pointer">Man</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="non-binary" id="gender-non-binary" />
                        <Label htmlFor="gender-non-binary" className="cursor-pointer">Non‑binary</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="self-describe" id="gender-self-describe" />
                        <Label htmlFor="gender-self-describe" className="cursor-pointer">Prefer to self‑describe:</Label>
                      </div>
                      {gender === 'self-describe' && (
                        <div className="ml-6">
                          <Input
                            value={genderSelfDescribe}
                            onChange={(e) => setGenderSelfDescribe(e.target.value)}
                            placeholder="Please describe..."
                            className="max-w-md"
                          />
                        </div>
                      )}
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="prefer-not-say-gender" id="gender-prefer-not-say" />
                        <Label htmlFor="gender-prefer-not-say" className="cursor-pointer">Prefer not to say</Label>
                      </div>
                    </div>
                  </RadioGroup>
                </div>

                <div>
                  <Label className="text-base font-medium mb-3 block">How experienced are you with meditation in general?</Label>
                  <RadioGroup value={meditationExperience} onValueChange={setMeditationExperience}>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="never" id="exp-never" />
                        <Label htmlFor="exp-never" className="cursor-pointer">I've never tried meditation before today</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="few-times" id="exp-few-times" />
                        <Label htmlFor="exp-few-times" className="cursor-pointer">I've tried it a few times</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="occasionally" id="exp-occasionally" />
                        <Label htmlFor="exp-occasionally" className="cursor-pointer">I meditate occasionally (less than once a week)</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="regularly" id="exp-regularly" />
                        <Label htmlFor="exp-regularly" className="cursor-pointer">I meditate regularly (at least once a week)</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="very-regularly" id="exp-very-regularly" />
                        <Label htmlFor="exp-very-regularly" className="cursor-pointer">I meditate very regularly (most days)</Label>
                      </div>
                    </div>
                  </RadioGroup>
                </div>

                <div>
                  <Label className="text-base font-medium mb-3 block">
                    How often do you use meditation apps or guided audios (e.g. Headspace, Calm, YouTube, etc.)?
                  </Label>
                  <RadioGroup value={meditationAppUsage} onValueChange={setMeditationAppUsage}>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="never-apps" id="apps-never" />
                        <Label htmlFor="apps-never" className="cursor-pointer">Never</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="less-month" id="apps-less-month" />
                        <Label htmlFor="apps-less-month" className="cursor-pointer">Less than once a month</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="once-month" id="apps-once-month" />
                        <Label htmlFor="apps-once-month" className="cursor-pointer">About once a month</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="once-week" id="apps-once-week" />
                        <Label htmlFor="apps-once-week" className="cursor-pointer">About once a week</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="several-week" id="apps-several-week" />
                        <Label htmlFor="apps-several-week" className="cursor-pointer">Several times a week</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="most-days" id="apps-most-days" />
                        <Label htmlFor="apps-most-days" className="cursor-pointer">Most days</Label>
                      </div>
                    </div>
                  </RadioGroup>
                </div>

                <div>
                  <Label htmlFor="additional-comments" className="text-base font-medium mb-2 block">
                    Anything else you'd like to share about your experience with this meditation or AI‑generated meditations in general?
                  </Label>
                  <textarea
                    id="additional-comments"
                    value={additionalComments}
                    onChange={(e) => setAdditionalComments(e.target.value)}
                    placeholder="Your thoughts..."
                    className="flex min-h-[80px] w-full max-w-2xl rounded-md border border-input bg-input-background px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                    rows={3}
                  />
                </div>
              </div>
            </section>

            {/* Submit Button */}
            <div className="border-t pt-8">
              <Button
                type="submit"
                className="w-full h-12 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                disabled={age === 'under18'}
              >
                Submit Questionnaire
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
