
import { PE_MANEUVERS_TYPE, Template } from './types';

export const TEMPLATES: Template[] = [
  {
    name: "IM OPD",
    content: `<b>PATIENT DETAILS</b>
NAME
AGE/SEX [BIRTHDATE]
 
CC:
Informant:
BFC: Independent in all ADLs, (-) exertional dyspnea, orthopnea, PND
 
<b>S></b>
<u>HISTORY OF PRESENT ILLNESS</u>
 
<u>REVIEW OF SYSTEMS</u>
(-) fever, chills, malaise, weight loss/gain
(-) headache, dizziness, weakness, numbness, syncope, seizures, tremors
(-) BOV, sore throat, dysphagia, hoarseness
(-) DOB, dyspnea, wheezing, cough
(-) chest pain, palpitations, orthopnea, PND
(-) abdominal pain, nausea, vomiting, constipation, diarrhea, melena, hematochezia, heartburn, epigastric burning, postprandial fullness, early satiety
(-) dysuria, oliguria/anuria, hematuria, nocturia, frequency, incontinence, post-void residue, difficulty starting urinary stream, intermittent urine flow, weak stream
(-) myalgia, arthralgia, rashes, easily bruisability, non-healing wounds, edema, pruritus
(-) polyuria, polydipsia, polyphagia, heat/cold intolerance
 
<u>PAST MEDICAL HISTORY</u>
(-) HTN, DM, BA, CVD, thyroid/kidney/liver disease, cancer
No previous PTB infection
No previous surgeries or hospitalizations
No known allergies to food and medications
No maintenance medications
Complete vaccinations
 
<u>FAMILY MEDICAL HISTORY</u>
No known heredofamilial diseases
 
<u>PERSONAL SOCIAL HISTORY</u>
Non smoker
Non alcoholic beverage drinker
Denies illicit drug use
Occupation
Religion
Sexual History

<u>OBSTETRIC & MENSTRUAL HISTORY</u>
G_P_
Menarche:
Interval:
Duration:
Amount:
Symptoms:
 
<b>O></b>
<u>PHYSICAL EXAMINATION</u>
VS HR RR BP T O2 RA
Awake, alert, oriented, NICRD
Aniteric sclerae, pink palpebral conjunctiva, (-) NVE, ANM, CLADs
Equal chest expansion, clear breath sounds, (-) crackles/wheezes
Adynamic precordium, distinct heart sounds, normal rhythm tachycardic rate, (-) murmurs
Soft nondistended, nontender abdomen, (-) CVA tenderness, (-) fluid wave 
FEP, CRT <2s, warm extremities, (-) jaundice, pallor, edema, rashes, petechiae, purpura, ecchymoses

<u>REVIEW OF LABS</u>
 
<b>A></b>
 
<b>P></b>
 
<u>DIAGNOSTICS</u>
[ ] CBC 

IMAGING
 
FOLLOW UP
 
<u>THERAPEUTICS (eGFR x)</u>
START
 
CONTINUE
 
HOLD
 
<u>NON-PHARMACOLOGICAL</u>


<u>PROCEDURES</u>
Risk Stratification Template:
Patient is of [low/intermediate/high] clinical risk for a [low/intermediate/high] risk surgical procedure. Patient is of [low/intermediate/high] risk (0.5% by RCRI) in developing MACE and is of [low/intermediate/high] risk (1.1% risk by ARISCAT) in developing post-operative pulmonary complications in a [low/intermediate/high] risk procedure. No absolute contraindications GENMED wise.
 
<u>GOALS</u>
[ ] Treat infection
[ ] Correct electrolytes
[ ] Symptom control
 
<u>REFERRALS</u>
[ ] Nutrition`
  },
  {
    name: "Surgery",
    content: `Surgery SOAP Note (Post-Op/Ward)
POD #: 
Procedure:

S>
Pain: (NRS /10)
Subjective status: (-) fever, (-) nausea/vomiting, (+) flatus, (+) bowel movement, (+) ambulation.

O>
VS: BP, HR, RR, Temp, O2
Abdomen: (+) Bowel sounds, (-) tenderness/guarding.
Wound: Clean, dry, intact dressing. (-) redness, (-) discharge.
Drains/Output: (Type/Volume/Color)
Fluids: 

A>

P>
Diet: 
Activity: 
Meds: 
Wound Care:`
  },
  {
    name: "OB-GYN",
    content: `OB-GYN SOAP Note
G_P_ (T_P_A_L_):
LMP: 
AOG: 
EDC:

S>
CC:
HPI: (Include fetal movement, contractions, vaginal bleeding, leaking per vaginum).
Prenatal Hx: (Labs, Ultrasound findings).

O>
VS:
Fundal Height: 
Leopold's: 
FHT (Fetal Heart Tone): 
IE (Internal Exam): (Dilation, Effacement, Station, BOW).

A>

P>
Meds: 
Labs: 
Monitoring:`
  },
  {
    name: "Pediatrics",
    content: `Pediatrics SOAP Note
Name:
Age: (Percentiles: Wt: , Ht: , HC: )

S>
CC:
HPI: 
Birth/Maternal Hx: 
Feeding Hx: 
Immunization: 
Developmental Milestones:

O>
General: Active, playful, not in distress.
Skin: (-) rashes, (-) jaundice.
HEENT: Flat fontanels (if infant), clear throat.
Chest/Lungs: Clear, (-) retractions.

A>

P>
Meds (Dosage in mg/kg): 
Nutrition: 
Follow-up:`
  },
  {
    name: "Neuro",
    content: `Neurology SOAP Note
Handedness: 

S>
CC:
HPI: (Onset, Focal deficits, Vision changes, Headache).

O>
MSE: Oriented x3, Attentive.
CN I-XII: (Specifically mention II, III, IV, VI, VII).
Motor: Power 5/5 in all extremities, no atrophy.
Sensory: Intact to pain/touch/proprioception.
DTRs: (2+ bilaterally), (-) Babinski.
Coordination: (Finger-to-nose), Gait.

A>

P>
Imaging (CT/MRI): 
Meds: 
Rehab:`
  },
  {
    name: "Psychiatry",
    content: `Psychiatry SOAP Note
S>
CC:
HPI: 
Stressors: 
Safety: (-) Suicidal/Homicidal ideation.

O> (Mental Status Exam)
Appearance/Behavior: 
Speech: (Rate, Volume, Tone).
Mood: 
Affect: 
Thought Process: (Linear, Goal-directed).
Thought Content: (-) Delusions, (-) Hallucinations.
Insight/Judgment: 

A> (Diagnosis/Differential)

P>
Psychotherapy: 
Pharmacotherapy: 
Safety Plan:`
  },
  {
    name: "Derma",
    content: `Dermatology SOAP Note
S>
CC:
HPI: (Duration, Itching, Pain, Evolution).
Exposures: (New soaps, detergents, medications).

O> (Skin Exam)
Distribution: (Localized, Generalized, Symmetric).
Configuration: (Annular, Linear, Grouped).
Lesion: (Primary: Macule, Papule, Vesicle / Secondary: Scale, Crust).
Color/Border/Texture: 

A>

P>
Topical Meds: 
Systemic Meds: 
Sun Protection:`
  },
  {
    name: "ORL (ENT)",
    content: `Otorhinolaryngology SOAP Note
S>
CC:
HPI: (Hearing loss, Ear pain, Nasal congestion, Sore throat, Vertigo).

O>
Otoscopy: (TM pearly gray, cone of light).
Rhinoscopy: (Turbinates, Septum, Mucosa).
Throat: (Tonsils grade, Uvula midline).
Neck: (-) Lymphadenopathy.

A>

P>
Meds: 
Procedures: 
Audiometry:`
  },
  {
    name: "Anesthesia",
    content: `Anesthesia Pre-Op Evaluation
ASA Status: 
Proposed Surgery: 

S>
PMH: (CVD, Pulmonary, DM).
NPO Status: 
Medications: (Anticoagulants? Antihypertensives?).
Previous Anesthesia: (Malignant Hyperthermia Hx?).

O> (Airway Assessment)
Mallampati Class: 
Thyromental Distance: 
Neck ROM: 
Dentition: 

A>

P>
Anesthetic Plan: (General, Spinal, Epidural, MAC).
Pre-meds: 
Monitors:`
  },
  {
    name: "FCM",
    content: `Family Medicine SOAP Note
S>
CC:
HPI: 
Social Hx: (Lifestyle, Nutrition, Physical Activity).
Family Dynamics: (Genogram, Family life cycle).

O>
PE: (Include screening parameters).
BMI: 

A> (Biopsychosocial Assessment)

P>
Preventive Care: (Screening, Vaccines).
Lifestyle Modification: 
Family Counseling:`
  },
   {
    name: "AMBU",
    content: `AMBU SOAP NOTES
GENERAL DATA: AGE, SEX, RELIGION, OCCUPATION, HANDEDNESS, from LOCATION OF RESIDENCE
COMORBIDITIES: 
CHIEF COMPLAINT:

Primary Survey:
Airway: airway is intact, speaks in sentences
Breathing: effortless breathing, not in respiratory distress, ( -) cyanosis, O2 sat __%  RR __
Circulation: BP __/__, PR __, warm skin, capillary refill time < 2 sec
Disability: GCS 15, Pupil Size 3mm OU BRTL, MMT 5/5 on all extremities, NRS: 
Exposure: (-)  environmental exposure
TEMP __
CBG __ (if dizzy, weak, altered sensorium, vomiting, known DM on insulin)

S>

CC:

HPI:


ROS:
(-) weakness, loss of appetite, easy fatigability
(-) cough, colds, fever, chills
(-) headache, recent BOV, dysgeusia
(-) chest pain, palpitations, orthopnea, dyspnea
(-) abdominal pain, nausea, vomiting
(-) diarrhea, melena, hematochezia
(-) dysuria, hematuria, oliguria
(-) joint pain, rash, edema, pruritus

Past Medical History
Comorbidities: 
Previous Hospitalizations/Surgeries: 
Allergies:
Current Medications/Vitamins/Supplements/Herbal meds:

Family History
(-) HTN, T2DM, Cancer, BA, Heart Disease, Kidney Disease

Personal and Social History
Smoking history: 
Alcoholic beverage drinking history: 
History of illicit drug use: 
Work:

IF NEEDED:
OB-GYNE History
GP
LMP or PMP:
MIDAS
Gynecological Hx: (-) STI, endometriosis, hx of ectopic pregnancy, gynecologic pathology, PID

IF NEEDED:
Sexual History
Coitarche:
No. of partners:
Sexual risk behaviors:
Use of contraceptives:
(-) post-coital bleeding, dyspareunia, discharge

Last meal:
Last UO:
Last BM:

O>
Vitals: 
General: Conscious, coherent, NICRD
HEENT: AS, Pink PC, no eye/ear/nose/mouth discharge, moist oral mucosa, no ANM, no CLADs, no NVD
Heart: AP, NR, RR, DHS, no murmurs
Lungs: SCE, CBS, no wheezes, no crackles
Abdomen: Flat, NABS, non-distended, non-tender
Skin: no rash, no ulcers, no bleeding
Extremities: no limb deformities, no edema, no jaundice, FEP, CRT <2s 

Neuro PE 
Cranial Nerves
I: not done
II: Pupils __ mm equal and reactive to light, intact direct and indirect pupillary reflex 
III, IV, VI: EOM intact, no gaze preference or deviation
V: intact and symmetrical sensation to touch in V1, V2, and V3 segments bilaterally
VII: no facial asymmetry, no nasolabial fold flattening
VIII: normal hearing to speech
IX: not done
X: no uvular deviation, strong head resistance to both sides 
XI: strong shoulder shrug, bilateral 
XII: no tongue deviation, no tongue fasciculation 

Motor - 5/5 on all extremities 
Reflex - 2+ on bilateral biceps, triceps, patellar, ankle reflex, (-) Babinski, (-) clonus 
Sensory - 100% sensation to on all extremities 
Cerebellar - no dysdiadochokinesia, no dysmetria, no rebound phenomenon 
Gait - normal gait; no ataxia
Meningeal signs - no Kernig, no Brudzinski 

Review of Labs:

A>


P>
DIAGNOSTICS:

THERAPEUTICS:
- At Ambu:
- THM: 

ADVISED:

Follow up: LOCATION, DATE

Watch out for:

Disposition - HOME
SROD or JROD/Int ____
`
  },
  {
    name: "Ortho SOAP",
    content: `[ORTHO SOAP Template]
Date/Time: 
Case #: 
Name: 
Age/Sex: 
Handedness: 
Occupation:
CC:

S>
HPI:
DOI/TOI/POI/MOI:
Deficits: Sensory/Motor?
Pain Level (NRS): /10
ROS: (-) fever, (-) head injury, (-) dyspnea, (-) numbness
PMH/FMH:
PSH: smoking/alcohol/drugs

O>
Awake, alert, not in distress
VS: BP, HR, RR, T, O2
UE/LE:
Inspection: (-) redness, (-) swelling, (-) deformity
Palpation: (-) tenderness, (-) crepitus
ROM/MMT:
Sensory: Intact
Vascular: CRT < 2s, equal pulses
Imaging:

A>

P>
Diagnostics:
Therapeutics:
Follow-up:`
  },
  {
    name: "Ophtha 251",
    content: `[OPHTHA 251 SOAP TEMPLATE]
Name: 
Age/Sex: 
CC:

S>
HPI: (-) redness, (-) FB sensation, (-) pain, (-) photophobia, (-) diplopia, (-) floaters
Ocular Hx: Spectacles, Surgery, Trauma, Infection
PMHx/FMHx: HTN, DM, Glaucoma, Cataract
PSHx: 

O>
VA: OD (sc/cc) OS (sc/cc)
Gross Exam: (-) redness, (-) swelling, (-) mass, (-) proptosis
Alignment: Orthophoric
Pupils: 3mm BRTL, (-) RAPD
EOM: Intact
Tonometry: Soft/Firm`
  }
];

export const PE_MANEUVERS: PE_MANEUVERS_TYPE = {
  "Lachman Test": {
    steps: ["Patient lies supine with the knee flexed to 20-30 degrees.", "Stabilize the distal femur with one hand.", "Grasp the proximal tibia with the other hand.", "Apply a brisk anteriorly directed force to the tibia.", "Positive sign: Increased anterior translation of the tibia or a 'soft' end-feel."],
    source: "Bates' Guide to Physical Examination"
  },
  "McMurray Test": {
    steps: ["Patient lies supine with the knee fully flexed.", "Grasp the heel and flex the knee.", "For Medial Meniscus: Externally rotate foot and slowly extend knee while applying valgus stress.", "For Lateral Meniscus: Internally rotate foot and slowly extend knee while applying varus stress.", "Positive sign: A click or pop at the joint line."],
    source: "Bates' Guide to Physical Examination"
  },
  "Phalen's Test": {
    steps: ["Hold wrists in complete and forced flexion (pushing back of hands together).", "Maintain position for 60 seconds.", "Positive sign: Numbness or tingling in median nerve distribution."],
    source: "Bates' Guide to Physical Examination"
  },
  "Murphy's Sign": {
    steps: ["Ask patient to exhale.", "Place hand below right costal margin at mid-clavicular line.", "Ask patient to inspire deeply.", "Positive sign: Sharp stop in inspiration due to pain."],
    source: "Bates' Guide"
  },
  "Hirschberg Test": {
    steps: ["Hold penlight at midline, 2 feet away.", "Observe position of corneal light reflex in each eye.", "Normal: Light reflex is slightly nasal to pupil center."],
    source: "Bates' Guide"
  },
  "Neer's Test": {
    steps: ["Stabilize scapula with one hand.", "Internally rotate arm (thumb down).", "Passive and forcibly elevate arm in scapular plane into full flexion.", "Positive sign: Shoulder pain."],
    source: "Bates' Guide"
  }
};
