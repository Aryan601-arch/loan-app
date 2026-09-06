import React, { useState, useMemo, useContext, createContext } from "react";
import {
  ArrowLeft, Bell, ShieldCheck, Zap, Smartphone, ChevronRight,
  CheckCircle2, Star, Building2, Wallet, FileCheck2, Landmark, Globe,
} from "lucide-react";
import { PieChart, Pie, Cell } from "recharts";

/* ---------------------------------------------------------
   Design tokens — inspired by the Nepal flag
   bg:      #FFFFFF (paper)  / panel: #EEF1F7 (cool stone)
   ink:     #101826 (near-black, blue-tinted)
   brand:   #00369B (Nepal blue)
   brand-2: #00224F (deep navy, for pressed/dark blocks)
   gold:    #E4002B (crimson - primary CTA, repurposed key name)
   rupee:   #00369B (blue, reused for success/positive states)
   line:    #D7DEE8 (hairline)
   Headline/number face: Space Grotesk. Body face: IBM Plex Sans.
--------------------------------------------------------- */

const C = {
  bg: "#FFFFFF",
  panel: "#EEF1F7",
  panelDeep: "#DCE3F0",
  ink: "#101826",
  inkSoft: "#4A5568",
  brand: "#00369B",
  brandDeep: "#00224F",
  gold: "#E4002B",
  goldDeep: "#B4001F",
  rupee: "#00369B",
  line: "#D7DEE8",
  danger: "#B4001F",
};

const fontHead = "'Space Grotesk', system-ui, sans-serif";
const fontBody = "'IBM Plex Sans', 'Noto Sans Devanagari', system-ui, sans-serif";

const inr = (n) =>
  "Rs. " + Math.round(n).toLocaleString("en-IN", { maximumFractionDigits: 0 });

function emiFor(principal, annualRate, months) {
  const r = annualRate / 12 / 100;
  if (r === 0) return principal / months;
  const factor = Math.pow(1 + r, months);
  return (principal * r * factor) / (factor - 1);
}

function amortizationSchedule(principal, annualRate, months) {
  const r = annualRate / 12 / 100;
  const emi = emiFor(principal, annualRate, months);
  let balance = principal;
  const rows = [];
  for (let m = 1; m <= months; m++) {
    const interest = balance * r;
    const principalPaid = Math.min(emi - interest, balance);
    balance = Math.max(balance - principalPaid, 0);
    rows.push({ month: m, emi, principalPaid, interest, balance });
  }
  return rows;
}

// Inverse of emiFor: max principal that keeps the EMI at/under a given cap.
function principalForEmi(maxEmi, annualRate, months) {
  const r = annualRate / 12 / 100;
  if (r === 0) return maxEmi * months;
  const factor = Math.pow(1 + r, months);
  return (maxEmi * (factor - 1)) / (r * factor);
}

// Salaried affordability policy: max EMI as a % of monthly income, by bracket
// (capped at 30% for all income above Rs. 40,000).
function salariedEmiCapPct(income) {
  if (income < 30000) return 0.20;
  if (income <= 40000) return 0.25;
  return 0.30;
}

function businessTurnoverCapPct(ageYears) {
  if (ageYears >= 5) return 0.25;
  if (ageYears >= 3) return 0.20;
  if (ageYears >= 1) return 0.15;
  return 0;
}

function businessAgeYears(dateStr) {
  const start = new Date(dateStr);
  const now = new Date();
  return (now - start) / (1000 * 60 * 60 * 24 * 365.25);
}

// Source: Nepal Rastra Bank, "List of Banks and Financial Institutions
// Licensed by NRB", as of Mid-June 2026 (nrb.org.np). Reference directory
// only — not linked to the mock loan offers shown elsewhere in this app.
// Institution names are official registered names and are kept in English
// in both languages.
const NEPAL_BFI_DIRECTORY = {
  A: {
    labelKey: "dir.classA",
    sub: "Class \"A\" · 20 institutions",
    items: [
      "Nepal Bank Ltd.", "Agricultural Development Bank Ltd.", "Nabil Bank Ltd.",
      "Nepal Investment Mega Bank Ltd.", "Standard Chartered Bank Nepal Ltd.",
      "Himalayan Bank Ltd.", "Nepal SBI Bank Ltd.", "Everest Bank Ltd.",
      "Kumari Bank Ltd.", "Laxmi Sunrise Bank Ltd.", "Citizens Bank International Ltd.",
      "Prime Commercial Bank Ltd.", "Sanima Bank Ltd.", "Machhapuchhre Bank Ltd.",
      "NIC Asia Bank Ltd.", "Global IME Bank Ltd.", "NMB Bank Ltd.",
      "Prabhu Bank Ltd.", "Siddhartha Bank Ltd.", "Rastriya Banijya Bank Ltd.",
    ],
  },
  B: {
    labelKey: "dir.classB",
    sub: "Class \"B\" · 17 institutions",
    items: [
      "Narayani Development Bank Ltd.", "Karnali Development Bank Ltd.",
      "Excel Development Bank Ltd.", "Miteri Development Bank Ltd.",
      "Muktinath Bikas Bank Ltd.", "Corporate Development Bank Ltd.",
      "Sindhu Bikas Bank Ltd.", "Salapa Bikash Bank Ltd.", "Green Development Bank Ltd.",
      "Sangrila Development Bank Ltd.", "Shine Resunga Development Bank Ltd.",
      "Jyoti Bikas Bank Ltd.", "Garima Bikas Bank Ltd.", "Mahalaxmi Bikas Bank Ltd.",
      "Lumbini Bikas Bank Ltd.", "Kamana Sewa Bikas Bank Ltd.", "Saptakoshi Development Bank Ltd.",
    ],
  },
  C: {
    labelKey: "dir.classC",
    sub: "Class \"C\" · 17 institutions",
    items: [
      "Nepal Finance Ltd.", "Nepal Share Markets and Finance Ltd.", "Goodwill Finance Ltd.",
      "Progressive Finance Ltd.", "Janaki Finance Co. Ltd.", "Pokhara Finance Ltd.",
      "Multipurpose Finance Ltd.", "Samriddhi Finance Company Limited",
      "Capital Merchant Banking & Finance Ltd.", "Guheshwori Merchant Banking & Finance Ltd.",
      "ICFC Finance Ltd.", "Manjushree Finance Ltd.", "Reliance Finance Ltd.",
      "Gurkhas Finance Ltd.", "Shree Investment & Finance Co. Ltd.", "Central Finance Ltd.",
      "Best Finance Ltd.",
    ],
  },
};

// City names — value stays the English form (used only for display, no
// logic depends on it); label switches to Devanagari when lang is "ne".
const NEPAL_CITIES = [
  { en: "Kathmandu", ne: "काठमाडौं" }, { en: "Lalitpur", ne: "ललितपुर" },
  { en: "Bhaktapur", ne: "भक्तपुर" }, { en: "Pokhara", ne: "पोखरा" },
  { en: "Biratnagar", ne: "विराटनगर" }, { en: "Bharatpur", ne: "भरतपुर" },
  { en: "Birgunj", ne: "वीरगञ्ज" }, { en: "Dharan", ne: "धरान" },
  { en: "Butwal", ne: "बुटवल" }, { en: "Hetauda", ne: "हेटौंडा" },
  { en: "Janakpur", ne: "जनकपुर" }, { en: "Nepalgunj", ne: "नेपालगञ्ज" },
  { en: "Itahari", ne: "इटहरी" }, { en: "Dhangadhi", ne: "धनगढी" },
  { en: "Tulsipur", ne: "तुलसीपुर" }, { en: "Ghorahi", ne: "घोराही" },
  { en: "Damak", ne: "दमक" }, { en: "Kalaiya", ne: "कलैया" },
];

const BUSINESS_TYPES = [
  { en: "Retail / Trading", ne: "खुद्रा / व्यापार" },
  { en: "Restaurant / Hotel", ne: "रेस्टुरेन्ट / होटल" },
  { en: "Manufacturing", ne: "उत्पादन" },
  { en: "Agriculture", ne: "कृषि" },
  { en: "Services", ne: "सेवा" },
  { en: "Handicrafts / Cottage industry", ne: "हस्तकला / घरेलु उद्योग" },
  { en: "Other", ne: "अन्य" },
];

const EMPLOYMENT_TYPES = [
  { en: "Salaried", ne: "जागिरे" },
  { en: "Self-employed", ne: "स्वरोजगार" },
  { en: "Small Business", ne: "साना व्यवसाय" },
];

const LENDERS = [
  { id: "l1", name: "Global IME Bank", rate: 12.5, maxAmt: 500000, fee: 2.0, days: 1, rating: 4.6 },
  { id: "l2", name: "Nepal Bank Limited", rate: 14.0, maxAmt: 300000, fee: 2.25, days: 1, rating: 4.4 },
  { id: "l3", name: "Muktinath Bikas Bank", rate: 16.0, maxAmt: 200000, fee: 2.75, days: 2, rating: 4.2 },
  { id: "l4", name: "Reliance Finance", rate: 17.5, maxAmt: 400000, fee: 3.0, days: 2, rating: 4.0 },
];

/* ---------------------------------------------------------
   i18n — English / Nepali
--------------------------------------------------------- */

const STRINGS = {
  en: {
    "home.heroTitle": (amt) => `Personal loans up to ${amt}, matched to you`,
    "home.heroSubtitle": "Compare offers from 50+ NRB-registered lenders and get money in your account, often the same day.",
    "home.howMuch": "How much do you need?",
    "home.estEmi": "Est. EMI for 24 months, from",
    "home.instantNote": "Instant disbursal — loans up to Rs. 25,000 are paid out within minutes of approval",
    "home.checkEligibility": "Check your eligibility",
    "home.instantLoanBtn": "Instant loan up to Rs. 25,000",
    "home.instantOnlySalaried": "Instant loans are available for salaried applicants only",
    "home.trust1": "NRB-registered\npartners",
    "home.trust2": "2-minute\ndecision",
    "home.trust3": "100% paperless\nprocess",
    "home.howItWorks": "How it works",
    "home.step1Title": "Tell us a little about yourself",
    "home.step1Desc": "Income, employment and city — takes about a minute.",
    "home.step2Title": "Compare matched offers",
    "home.step2Desc": "See real interest rates side by side, no guesswork.",
    "home.step3Title": "Get funds in your account",
    "home.step3Desc": "Accept an offer, verify your details, and you're done.",
    "home.browseDirectory": "Browse all NRB-licensed institutions",

    "elig.title": "A little about you",
    "elig.instantNote": "Instant loans (up to Rs. 25,000) are available for salaried applicants only.",
    "elig.employmentType": "Employment type",
    "elig.businessName": "Business name",
    "elig.businessNamePlaceholder": "e.g. Shah Traders",
    "elig.businessType": "Business type",
    "elig.selectBusinessType": "Select business type",
    "elig.registrationNumber": "Business registration number",
    "elig.registrationPlaceholder": "e.g. 123456/078/079",
    "elig.panNumber": "PAN number",
    "elig.panPlaceholder": "9-digit IRD PAN",
    "elig.businessSince": "Business established since",
    "elig.businessAgeError": "Your business needs to be at least 1 year old to be eligible.",
    "elig.businessAgeNote": "Business loans require a minimum of 1 year in operation and tax clearance for at least 1 completed financial year.",
    "elig.annualTurnover": "Annual sales turnover (Rs.)",
    "elig.monthlyIncome": "Monthly income (Rs.)",
    "elig.turnoverPlaceholder": "e.g. 70,00,000",
    "elig.incomePlaceholder": "e.g. 45,000",
    "elig.turnoverRangeNote": "This product is for small businesses with annual sales between Rs. 50,00,000 and Rs. 1,00,00,000.",
    "elig.age": "Age",
    "elig.agePlaceholder": "e.g. 29",
    "elig.city": "City",
    "elig.selectCity": "Select your city",
    "elig.disclaimer": "Checking your eligibility here is free and does not affect your credit score.",
    "elig.seeOffers": "See my offers",

    "dir.title": "Licensed institutions",
    "dir.desc": "All banks and financial institutions currently licensed by Nepal Rastra Bank (NRB), as of mid-June 2026.",
    "dir.class": (k) => `Class ${k}`,
    "dir.classA": "Commercial Banks",
    "dir.classB": "Development Banks",
    "dir.classC": "Finance Companies",

    "offers.title": "Your matched offers",
    "offers.lowestInterest": "Lowest interest",
    "offers.fastestPayout": "Fastest payout",
    "offers.count": (n, amt) => `${n} lenders can offer you ${amt}`,
    "offers.interest": "Interest",
    "offers.serviceCharge": "Service charge",
    "offers.payoutIn": "Payout in",
    "offers.day": (n) => `${n} day${n > 1 ? "s" : ""}`,

    "calc.monthlyEmi": "Monthly EMI",
    "calc.principal": "Principal",
    "calc.interest": "Interest",
    "calc.loanAmount": "Loan amount",
    "calc.instantEligible": "Eligible for instant disbursal — loans up to Rs. 25,000 are paid out within minutes of approval",
    "calc.tenure": "Tenure",
    "calc.months": (n) => `${n} months`,
    "calc.payoutTime": "Payout time",
    "calc.instantWithinMinutes": "Instant (within minutes)",
    "calc.businessDays": (n) => `${n} business day${n > 1 ? "s" : ""}`,
    "calc.interestRate": "Interest rate",
    "calc.totalPayable": "Total payable",
    "calc.serviceCharge": "Service charge",
    "calc.ofLoanAmount": "% of loan amount",
    "calc.viewSchedule": "View full repayment schedule",
    "calc.continueWith": (name) => `Continue with ${name}`,

    "repay.title": "Repayment schedule",
    "repay.subtitle": (tenure, amt, rate, name) => `${tenure} monthly instalments for ${amt} at ${rate}% p.a. with ${name}`,
    "repay.emi": "EMI",
    "repay.principal": "Principal",
    "repay.interest": "Interest",
    "repay.balance": "Balance",

    "kyc.title": "Verify your details",
    "kyc.fullName": "Full name (as per citizenship)",
    "kyc.namePlaceholder": "e.g. Priya Shah",
    "kyc.citizenshipNumber": "Citizenship number",
    "kyc.citizenshipPlaceholder": "e.g. 12-34-56-78901",
    "kyc.nidNumber": "National ID (NID) number",
    "kyc.nidPlaceholder": "10-digit NID number",
    "kyc.nidTooShort": "NID number must be exactly 10 digits.",
    "kyc.panNumber": "PAN number",
    "kyc.panPlaceholder": "9-digit IRD PAN",
    "kyc.mobileNumber": "Mobile number",
    "kyc.mobilePlaceholder": "10-digit mobile number",
    "kyc.bankName": "Bank name",
    "kyc.selectBank": "Select your bank",
    "kyc.bankAccount": "Bank account for disbursal",
    "kyc.accountPlaceholder": "Account number",
    "kyc.taxClearance": "Tax clearance certificate",
    "kyc.firmRegistration": "Firm registration certificate",
    "kyc.citizenshipDoc": "Citizenship document",
    "kyc.panCertificate": "PAN certificate",
    "kyc.auditReport": "Latest audit report",
    "kyc.uploadPrompt": "Upload PDF or photo",
    "kyc.browse": "Browse",
    "kyc.taxClearanceNote": "Tax clearance certificate from the Inland Revenue Department (IRD) for at least 1 completed financial year.",
    "kyc.verifyNote": "We'll verify your identity digitally through your citizenship number and mobile number. No paperwork needed.",
    "kyc.consent": (name) => `I agree to share my details with the selected lending partner and consent to a credit check. I understand SAATHI facilitates this application and assesses eligibility on the lender's behalf, but the loan decision and lending risk rest fully with ${name}, as required under NRB's Digital Lending Guideline.`,
    "kyc.submit": "Submit application",

    "status.submitted": "Application submitted",
    "status.reviewing": (name, amt) => `${name} is reviewing your request for ${amt}. Reference`,
    "status.stepReceived": "Application received",
    "status.stepIdentity": "Identity verification",
    "status.stepApproval": "Lender approval",
    "status.stepDisbursed": "Funds disbursed",
    "status.justNow": "Just now",
    "status.usuallyMinutes": "Usually within a few minutes",
    "status.instantDisbursalNote": "This loan qualifies for instant disbursal — funds are typically credited to your bank account within minutes of approval.",
    "status.normalDisbursalNote": (days) => `Funds are typically disbursed to your bank account within ${days} business day${days > 1 ? "s" : ""} of approval.`,
    "status.backToHome": "Back to home",
  },

  ne: {
    "home.heroTitle": (amt) => `${amt} सम्मको व्यक्तिगत ऋण, तपाईंको लागि मिलाइएको`,
    "home.heroSubtitle": "५०+ NRB-दर्ता भएका ऋणदाताहरूको प्रस्ताव तुलना गर्नुहोस् र प्रायः सोही दिन आफ्नो खातामा रकम प्राप्त गर्नुहोस्।",
    "home.howMuch": "तपाईंलाई कति आवश्यक छ?",
    "home.estEmi": "२४ महिनाको अनुमानित EMI, यसदेखि सुरु",
    "home.instantNote": "तुरुन्त भुक्तानी — रु. २५,००० सम्मको ऋण स्वीकृति पछि मिनेटभित्रै भुक्तानी हुन्छ",
    "home.checkEligibility": "आफ्नो योग्यता जाँच गर्नुहोस्",
    "home.instantLoanBtn": "रु. २५,००० सम्मको तुरुन्त ऋण",
    "home.instantOnlySalaried": "तुरुन्त ऋण जागिरे आवेदकहरूका लागि मात्र उपलब्ध छ",
    "home.trust1": "NRB-दर्ता\nसाझेदारहरू",
    "home.trust2": "२-मिनेट\nनिर्णय",
    "home.trust3": "१००% कागजरहित\nप्रक्रिया",
    "home.howItWorks": "यसरी काम गर्छ",
    "home.step1Title": "आफ्नो बारेमा थोरै बताउनुहोस्",
    "home.step1Desc": "आम्दानी, पेशा र सहर — लगभग एक मिनेट लाग्छ।",
    "home.step2Title": "मिलेका प्रस्तावहरू तुलना गर्नुहोस्",
    "home.step2Desc": "वास्तविक ब्याजदरहरू छेउछेउमा हेर्नुहोस्, अड्कल लगाउनु पर्दैन।",
    "home.step3Title": "आफ्नो खातामा रकम प्राप्त गर्नुहोस्",
    "home.step3Desc": "प्रस्ताव स्वीकार गर्नुहोस्, विवरण प्रमाणित गर्नुहोस्, र सकियो।",
    "home.browseDirectory": "सबै NRB-इजाजतपत्र प्राप्त संस्थाहरू हेर्नुहोस्",

    "elig.title": "तपाईंको बारेमा थोरै",
    "elig.instantNote": "तुरुन्त ऋण (रु. २५,००० सम्म) जागिरे आवेदकहरूका लागि मात्र उपलब्ध छ।",
    "elig.employmentType": "पेशाको प्रकार",
    "elig.businessName": "व्यवसायको नाम",
    "elig.businessNamePlaceholder": "उदाहरण: शाह ट्रेडर्स",
    "elig.businessType": "व्यवसायको प्रकार",
    "elig.selectBusinessType": "व्यवसायको प्रकार छान्नुहोस्",
    "elig.registrationNumber": "व्यवसाय दर्ता नम्बर",
    "elig.registrationPlaceholder": "उदाहरण: 123456/078/079",
    "elig.panNumber": "PAN नम्बर",
    "elig.panPlaceholder": "९ अंकको IRD PAN",
    "elig.businessSince": "व्यवसाय स्थापना मिति",
    "elig.businessAgeError": "योग्य हुन तपाईंको व्यवसाय कम्तीमा १ वर्ष पुरानो हुनुपर्छ।",
    "elig.businessAgeNote": "व्यवसाय ऋणका लागि कम्तीमा १ वर्षको सञ्चालन र कम्तीमा १ पूरा भएको आर्थिक वर्षको कर चुक्ता प्रमाणपत्र आवश्यक छ।",
    "elig.annualTurnover": "वार्षिक बिक्री कारोबार (रु.)",
    "elig.monthlyIncome": "मासिक आम्दानी (रु.)",
    "elig.turnoverPlaceholder": "उदाहरण: ७०,००,०००",
    "elig.incomePlaceholder": "उदाहरण: ४५,०००",
    "elig.turnoverRangeNote": "यो सुविधा रु. ५०,००,००० देखि रु. १,००,००,००० सम्मको वार्षिक बिक्री भएका साना व्यवसायहरूका लागि हो।",
    "elig.age": "उमेर",
    "elig.agePlaceholder": "उदाहरण: २९",
    "elig.city": "सहर",
    "elig.selectCity": "आफ्नो सहर छान्नुहोस्",
    "elig.disclaimer": "यहाँ योग्यता जाँच गर्नु निःशुल्क छ र यसले तपाईंको क्रेडिट स्कोरमा असर गर्दैन।",
    "elig.seeOffers": "मेरा प्रस्तावहरू हेर्नुहोस्",

    "dir.title": "इजाजतपत्र प्राप्त संस्थाहरू",
    "dir.desc": "नेपाल राष्ट्र बैंक (NRB) बाट हाल इजाजतपत्र प्राप्त सबै बैंक तथा वित्तीय संस्थाहरू, मध्य-जून २०२६ सम्मको।",
    "dir.class": (k) => `वर्ग ${k}`,
    "dir.classA": "वाणिज्य बैंकहरू",
    "dir.classB": "विकास बैंकहरू",
    "dir.classC": "वित्त कम्पनीहरू",

    "offers.title": "तपाईंसँग मिल्ने प्रस्तावहरू",
    "offers.lowestInterest": "न्यूनतम ब्याज",
    "offers.fastestPayout": "छिटो भुक्तानी",
    "offers.count": (n, amt) => `${amt} प्रदान गर्न सक्ने ${n} ऋणदाताहरू`,
    "offers.interest": "ब्याज",
    "offers.serviceCharge": "सेवा शुल्क",
    "offers.payoutIn": "भुक्तानी अवधि",
    "offers.day": (n) => `${n} दिन`,

    "calc.monthlyEmi": "मासिक EMI",
    "calc.principal": "मूल रकम",
    "calc.interest": "ब्याज",
    "calc.loanAmount": "ऋण रकम",
    "calc.instantEligible": "तुरुन्त भुक्तानीका लागि योग्य — रु. २५,००० सम्मको ऋण स्वीकृति पछि मिनेटभित्रै भुक्तानी हुन्छ",
    "calc.tenure": "अवधि",
    "calc.months": (n) => `${n} महिना`,
    "calc.payoutTime": "भुक्तानी समय",
    "calc.instantWithinMinutes": "तुरुन्त (मिनेटभित्र)",
    "calc.businessDays": (n) => `${n} कार्य दिन`,
    "calc.interestRate": "ब्याजदर",
    "calc.totalPayable": "कुल तिर्नुपर्ने रकम",
    "calc.serviceCharge": "सेवा शुल्क",
    "calc.ofLoanAmount": "% ऋण रकमको",
    "calc.viewSchedule": "पूर्ण भुक्तानी तालिका हेर्नुहोस्",
    "calc.continueWith": (name) => `${name} सँग अगाडि बढ्नुहोस्`,

    "repay.title": "भुक्तानी तालिका",
    "repay.subtitle": (tenure, amt, rate, name) => `${name} सँग वार्षिक ${rate}% मा ${amt} का लागि ${tenure} मासिक किस्ता`,
    "repay.emi": "EMI",
    "repay.principal": "मूल रकम",
    "repay.interest": "ब्याज",
    "repay.balance": "बाँकी रकम",

    "kyc.title": "आफ्नो विवरण प्रमाणित गर्नुहोस्",
    "kyc.fullName": "पूरा नाम (नागरिकता अनुसार)",
    "kyc.namePlaceholder": "उदाहरण: प्रिया साह",
    "kyc.citizenshipNumber": "नागरिकता नम्बर",
    "kyc.citizenshipPlaceholder": "उदाहरण: 12-34-56-78901",
    "kyc.nidNumber": "राष्ट्रिय परिचयपत्र (NID) नम्बर",
    "kyc.nidPlaceholder": "१०-अंकको NID नम्बर",
    "kyc.nidTooShort": "NID नम्बर ठ्याक्कै १० अंकको हुनुपर्छ।",
    "kyc.panNumber": "PAN नम्बर",
    "kyc.panPlaceholder": "९-अंकको IRD PAN",
    "kyc.mobileNumber": "मोबाइल नम्बर",
    "kyc.mobilePlaceholder": "१०-अंकको मोबाइल नम्बर",
    "kyc.bankName": "बैंकको नाम",
    "kyc.selectBank": "आफ्नो बैंक छान्नुहोस्",
    "kyc.bankAccount": "भुक्तानीका लागि बैंक खाता",
    "kyc.accountPlaceholder": "खाता नम्बर",
    "kyc.taxClearance": "कर चुक्ता प्रमाणपत्र",
    "kyc.firmRegistration": "फर्म दर्ता प्रमाणपत्र",
    "kyc.citizenshipDoc": "नागरिकता कागजात",
    "kyc.panCertificate": "PAN प्रमाणपत्र",
    "kyc.auditReport": "पछिल्लो लेखा परीक्षण प्रतिवेदन",
    "kyc.uploadPrompt": "PDF वा फोटो अपलोड गर्नुहोस्",
    "kyc.browse": "ब्राउज गर्नुहोस्",
    "kyc.taxClearanceNote": "आन्तरिक राजस्व विभाग (IRD) बाट कम्तीमा १ पूरा भएको आर्थिक वर्षको कर चुक्ता प्रमाणपत्र।",
    "kyc.verifyNote": "हामी तपाईंको नागरिकता नम्बर र मोबाइल नम्बर मार्फत डिजिटल रूपमा पहिचान प्रमाणित गर्नेछौं। कागजी कारबाही आवश्यक छैन।",
    "kyc.consent": (name) => `म आफ्नो विवरण छानिएको ऋण साझेदारसँग साझा गर्न र क्रेडिट जाँचमा सहमति जनाउँछु। SAATHI ले यो आवेदन सहजीकरण गर्छ र ऋणदाताको तर्फबाट योग्यता मूल्याङ्कन गर्छ भन्ने मलाई थाहा छ, तर ऋण सम्बन्धी निर्णय र जोखिम पूर्ण रूपमा ${name} मा रहन्छ, जुन NRB को डिजिटल ऋण दिशानिर्देश अनुसार आवश्यक छ।`,
    "kyc.submit": "आवेदन पेश गर्नुहोस्",

    "status.submitted": "आवेदन पेश गरियो",
    "status.reviewing": (name, amt) => `${name} ले तपाईंको ${amt} को अनुरोध समीक्षा गर्दैछ। सन्दर्भ`,
    "status.stepReceived": "आवेदन प्राप्त भयो",
    "status.stepIdentity": "पहिचान प्रमाणीकरण",
    "status.stepApproval": "ऋणदाता स्वीकृति",
    "status.stepDisbursed": "रकम भुक्तानी भयो",
    "status.justNow": "अहिले भर्खर",
    "status.usuallyMinutes": "प्रायः केही मिनेटभित्र",
    "status.instantDisbursalNote": "यो ऋण तुरुन्त भुक्तानीका लागि योग्य छ — रकम सामान्यतया स्वीकृति पछि मिनेटभित्रै तपाईंको बैंक खातामा जम्मा हुन्छ।",
    "status.normalDisbursalNote": (days) => `रकम सामान्यतया स्वीकृति पछि ${days} कार्य दिनभित्र तपाईंको बैंक खातामा भुक्तानी हुन्छ।`,
    "status.backToHome": "गृहपृष्ठमा फर्कनुहोस्",
  },
};

const LangContext = createContext({ lang: "en", setLang: () => {} });

function useT() {
  const { lang } = useContext(LangContext);
  return (key, ...args) => {
    const entry = STRINGS[lang][key] ?? STRINGS.en[key] ?? key;
    return typeof entry === "function" ? entry(...args) : entry;
  };
}

function useLang() {
  return useContext(LangContext);
}

/* ---------------------------------------------------------
   Small shared pieces
--------------------------------------------------------- */

function StatusBar() {
  return (
    <div className="flex items-center justify-between px-5 pt-3 pb-1 text-xs" style={{ color: C.ink, fontFamily: fontBody }}>
      <span style={{ fontWeight: 600 }}>9:41</span>
      <div className="flex items-center gap-1">
        <div className="w-4 h-2.5 rounded-sm" style={{ background: C.ink }} />
      </div>
    </div>
  );
}

const NP = { crimson: "#E4002B", crimsonDeep: "#B4001F", blue: "#00369B", blueBright: "#1155D6", blueLight: "#6C93E0" };

function AppBar({ title, onBack, right }) {
  return (
    <div className="flex items-center justify-between px-5 py-3">
      <div className="flex items-center gap-2">
        {onBack && (
          <button onClick={onBack} className="p-1 -ml-1" aria-label="Back">
            <ArrowLeft size={20} color={C.ink} />
          </button>
        )}
        <span style={{ fontFamily: fontHead, fontWeight: 600, fontSize: 17, color: C.ink }}>
          {title}
        </span>
      </div>
      {right}
    </div>
  );
}

function PrimaryButton({ children, onClick, disabled, style }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full py-4 flex items-center justify-center gap-2 transition-opacity"
      style={{
        background: disabled ? C.line : C.gold,
        color: C.brandDeep,
        fontFamily: fontHead,
        fontWeight: 700,
        fontSize: 16,
        borderRadius: 999,
        opacity: disabled ? 0.7 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
        ...style,
      }}
    >
      {children}
    </button>
  );
}

function BottomBar({ children }) {
  return (
    <div className="px-5 pt-3 pb-6" style={{ borderTop: `1px solid ${C.line}`, background: C.bg }}>
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block mb-4">
      <span className="block mb-1.5 text-xs" style={{ fontFamily: fontBody, color: C.inkSoft, fontWeight: 500 }}>
        {label}
      </span>
      {children}
    </label>
  );
}

function DocUploadField({ label, value, onChange, note }) {
  const t = useT();
  return (
    <Field label={label}>
      <label
        className="flex items-center justify-between px-3.5 py-3 cursor-pointer"
        style={{ ...inputStyle, display: "flex" }}
      >
        <span style={{ color: value ? C.ink : C.inkSoft, fontSize: 13.5 }}>
          {value ? value : t("kyc.uploadPrompt")}
        </span>
        <span style={{ fontFamily: fontHead, fontWeight: 600, fontSize: 12, color: C.brand }}>{t("kyc.browse")}</span>
        <input
          type="file"
          accept=".pdf,image/*"
          className="hidden"
          onChange={(e) => onChange(e.target.files?.[0]?.name || "")}
        />
      </label>
      {note && (
        <span style={{ display: "block", marginTop: 6, fontFamily: fontBody, fontSize: 11, color: C.inkSoft }}>
          {note}
        </span>
      )}
    </Field>
  );
}

const inputStyle = {
  width: "100%",
  padding: "12px 14px",
  border: `1px solid ${C.line}`,
  borderRadius: 10,
  fontFamily: fontBody,
  fontSize: 15,
  color: C.ink,
  background: "#FCFBF8",
  outline: "none",
};

function Progress({ step, total }) {
  return (
    <div className="flex gap-1.5 px-5 mb-1">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="flex-1 h-1 rounded-full"
          style={{ background: i < step ? C.brand : C.line }}
        />
      ))}
    </div>
  );
}

function LangToggle() {
  const { lang, setLang } = useLang();
  return (
    <button
      onClick={() => setLang(lang === "en" ? "ne" : "en")}
      aria-label="Toggle language"
      className="flex items-center gap-1 px-2.5 py-1.5"
      style={{ border: `1px solid ${C.line}`, borderRadius: 999, background: C.panel }}
    >
      <Globe size={13} color={C.brand} />
      <span style={{ fontFamily: fontHead, fontWeight: 700, fontSize: 11, color: C.brand }}>
        {lang === "en" ? "नेपाली" : "English"}
      </span>
    </button>
  );
}

/* ---------------------------------------------------------
   Screens
--------------------------------------------------------- */

function HomeScreen({ go, amount, setAmount, setElig, setInstantMode }) {
  const t = useT();
  const previewEmi = emiFor(amount, 13, 24);
  return (
    <div className="flex flex-col h-full" style={{ background: C.bg }}>
      <StatusBar />
      <div className="flex items-center justify-between px-5 pt-2 pb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 flex items-center justify-center" style={{ background: NP.crimson, borderRadius: 8, border: `1.5px solid ${NP.blue}` }}>
            <Wallet size={16} color="#fff" />
          </div>
          <span style={{ fontFamily: fontHead, fontWeight: 700, fontSize: 18, color: C.ink }}>SAATHI</span>
        </div>
        <div className="flex items-center gap-2">
          <LangToggle />
          <button aria-label="Notifications" className="p-1">
            <Bell size={20} color={C.ink} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5">
        {/* Hero — inspired by the Nepal flag: crimson field with a strong blue presence */}
        <div
          className="relative overflow-hidden mb-6"
          style={{
            background: `linear-gradient(135deg, ${NP.crimson} 0%, ${NP.crimson} 45%, ${NP.blueBright} 78%, ${NP.blue} 100%)`,
            border: `3px solid ${NP.blue}`,
            borderRadius: 18,
            padding: "22px 20px 50px",
            clipPath: "polygon(0 0, 100% 0, 100% 88%, 55% 100%, 0 92%)",
          }}
        >
          <div
            className="absolute"
            style={{
              top: -50, right: -50, width: 200, height: 200, borderRadius: "50%",
              background: `radial-gradient(circle, ${NP.blueBright} 0%, ${NP.blue} 65%, transparent 100%)`,
              opacity: 0.95,
            }}
          />
          <svg
            className="absolute"
            style={{ bottom: -1, left: 0, width: "100%", height: 58 }}
            viewBox="0 0 300 80"
            preserveAspectRatio="none"
          >
            {/* Himalayan peaks, snow-capped */}
            <polygon points="0,80 0,26 30,4 55,24 82,0 112,26 145,6 178,28 205,2 235,24 262,8 300,26 300,80" fill={NP.blue} opacity="0.92" />
            <polyline points="0,26 30,4 55,24 82,0 112,26 145,6 178,28 205,2 235,24 262,8 300,26" fill="none" stroke="#fff" strokeOpacity="0.7" strokeWidth="1.5" />
            {/* Foothills */}
            <polygon points="0,80 0,46 45,30 90,50 135,32 180,52 225,34 270,50 300,40 300,80" fill={NP.blueBright} opacity="0.9" />
            {/* Terai plain */}
            <polygon points="0,80 0,60 300,60 300,80" fill={NP.blueLight} opacity="0.85" />
            {/* River winding through the foothills into the plain */}
            <path
              d="M20,50 C55,58 60,42 95,48 C130,54 128,66 165,64 C200,62 205,50 240,54 C265,57 270,66 290,64"
              fill="none" stroke="#fff" strokeOpacity="0.6" strokeWidth="2" strokeLinecap="round"
            />
          </svg>
          <h1 style={{ position: "relative", fontFamily: fontHead, fontWeight: 700, fontSize: 27, lineHeight: 1.18, color: "#fff", letterSpacing: "-0.01em", maxWidth: "78%" }}>
            {t("home.heroTitle", inr(500000))}
          </h1>
          <p className="mt-2" style={{ position: "relative", fontFamily: fontBody, fontSize: 13.5, color: "rgba(255,255,255,0.92)", lineHeight: 1.5, maxWidth: "85%" }}>
            {t("home.heroSubtitle")}
          </p>
        </div>

        {/* Amount preview panel */}
        <div className="p-5 mb-5" style={{ background: C.panel, borderRadius: 16 }}>
          <div className="flex items-baseline justify-between mb-3">
            <span style={{ fontFamily: fontBody, fontSize: 13, color: C.inkSoft }}>{t("home.howMuch")}</span>
            <span style={{ fontFamily: fontHead, fontWeight: 700, fontSize: 26, color: C.ink, fontVariantNumeric: "tabular-nums" }}>
              {inr(amount)}
            </span>
          </div>
          <input
            type="range"
            min={5000}
            max={500000}
            step={5000}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="w-full"
            style={{ accentColor: C.brand }}
          />
          <div className="flex justify-between mt-1" style={{ fontFamily: fontBody, fontSize: 11, color: C.inkSoft }}>
            <span>Rs. 5,000</span>
            <span>Rs. 5,00,000</span>
          </div>
          <div className="mt-3 pt-3 flex items-center justify-between" style={{ borderTop: `1px solid ${C.panelDeep}` }}>
            <span style={{ fontFamily: fontBody, fontSize: 12.5, color: C.inkSoft }}>{t("home.estEmi")}</span>
            <span style={{ fontFamily: fontHead, fontWeight: 600, fontSize: 15, color: C.brand }}>{inr(previewEmi)}/mo</span>
          </div>
          {amount <= 25000 && (
            <div className="flex items-center gap-1.5 mt-3 pt-3" style={{ borderTop: `1px solid ${C.panelDeep}` }}>
              <Zap size={13} color={C.brandDeep} />
              <span style={{ fontFamily: fontBody, fontSize: 11.5, fontWeight: 600, color: C.brandDeep }}>
                {t("home.instantNote")}
              </span>
            </div>
          )}
        </div>

        <PrimaryButton onClick={() => { setInstantMode(false); go("eligibility"); }}>
          {t("home.checkEligibility")} <ChevronRight size={18} />
        </PrimaryButton>

        <button
          onClick={() => {
            setAmount(Math.min(amount, 25000));
            setElig((d) => ({ ...d, employment: "Salaried" }));
            setInstantMode(true);
            go("eligibility");
          }}
          className="w-full flex items-center justify-center gap-2 py-3.5 mt-3"
          style={{
            fontFamily: fontHead, fontWeight: 600, fontSize: 14, color: C.brand,
            border: `1.5px solid ${C.brand}`, borderRadius: 999, background: "transparent",
          }}
        >
          <Zap size={16} color={C.brand} />
          {t("home.instantLoanBtn")}
        </button>
        <p className="text-center mt-2" style={{ fontFamily: fontBody, fontSize: 10.5, color: C.inkSoft }}>
          {t("home.instantOnlySalaried")}
        </p>

        {/* Trust strip */}
        <div className="grid grid-cols-3 gap-3 mt-6 mb-6">
          {[
            { icon: ShieldCheck, key: "home.trust1" },
            { icon: Zap, key: "home.trust2" },
            { icon: Smartphone, key: "home.trust3" },
          ].map((item, i) => (
            <div key={i} className="flex flex-col items-center text-center gap-1.5 py-3" style={{ background: C.panel, borderRadius: 12 }}>
              <item.icon size={18} color={C.brand} />
              <span style={{ fontFamily: fontBody, fontSize: 10.5, color: C.inkSoft, whiteSpace: "pre-line", lineHeight: 1.3 }}>
                {t(item.key)}
              </span>
            </div>
          ))}
        </div>

        {/* How it works — genuine sequence, numbering is warranted */}
        <div className="mb-6">
          <h2 style={{ fontFamily: fontHead, fontWeight: 600, fontSize: 15, color: C.ink, marginBottom: 12 }}>{t("home.howItWorks")}</h2>
          {[
            ["1", "home.step1Title", "home.step1Desc"],
            ["2", "home.step2Title", "home.step2Desc"],
            ["3", "home.step3Title", "home.step3Desc"],
          ].map(([n, titleKey, descKey]) => (
            <div key={n} className="flex gap-3 mb-3.5">
              <div className="flex items-center justify-center shrink-0" style={{ width: 26, height: 26, borderRadius: "50%", background: C.brandDeep, color: C.gold, fontFamily: fontHead, fontWeight: 700, fontSize: 12 }}>
                {n}
              </div>
              <div>
                <div style={{ fontFamily: fontBody, fontWeight: 600, fontSize: 14, color: C.ink }}>{t(titleKey)}</div>
                <div style={{ fontFamily: fontBody, fontSize: 12.5, color: C.inkSoft, marginTop: 1 }}>{t(descKey)}</div>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => go("directory")}
          className="w-full flex items-center justify-between py-3.5 px-4 mb-6"
          style={{ background: C.panel, borderRadius: 12 }}
        >
          <div className="flex items-center gap-2.5">
            <Landmark size={16} color={C.brand} />
            <span style={{ fontFamily: fontBody, fontWeight: 600, fontSize: 12.5, color: C.ink }}>
              {t("home.browseDirectory")}
            </span>
          </div>
          <ChevronRight size={16} color={C.inkSoft} />
        </button>
      </div>
    </div>
  );
}

function EligibilityScreen({ go, data, setData, instantMode }) {
  const t = useT();
  const { lang } = useLang();
  const isBusiness = data.employment === "Small Business";
  const valid = data.income && data.city && data.age && (!isBusiness || (
    data.businessName && data.businessType && data.registrationNo &&
    data.businessSince && businessAgeYears(data.businessSince) >= 1
  ));
  return (
    <div className="flex flex-col h-full" style={{ background: C.bg }}>
      <StatusBar />
      <AppBar title={t("elig.title")} onBack={() => go("home")} />
      <Progress step={1} total={3} />
      <div className="flex-1 overflow-y-auto px-5 pt-5">
        {instantMode && (
          <div className="flex items-center gap-2 mb-4 p-3" style={{ background: C.panel, borderRadius: 10 }}>
            <Zap size={15} color={C.brand} className="shrink-0" />
            <span style={{ fontFamily: fontBody, fontSize: 11.5, color: C.ink, lineHeight: 1.4 }}>
              {t("elig.instantNote")}
            </span>
          </div>
        )}
        <Field label={t("elig.employmentType")}>
          <div className="flex gap-2">
            {EMPLOYMENT_TYPES.map((opt) => {
              const disabled = instantMode && opt.en !== "Salaried";
              return (
                <button
                  key={opt.en}
                  disabled={disabled}
                  onClick={() => !disabled && setData({ ...data, employment: opt.en })}
                  className="flex-1 py-2.5 text-xs"
                  style={{
                    fontFamily: fontBody, fontWeight: 500, borderRadius: 10,
                    border: `1px solid ${data.employment === opt.en ? C.brand : C.line}`,
                    background: data.employment === opt.en ? C.brand : "transparent",
                    color: disabled ? C.line : (data.employment === opt.en ? "#fff" : C.ink),
                    opacity: disabled ? 0.6 : 1,
                    cursor: disabled ? "not-allowed" : "pointer",
                  }}
                >
                  {lang === "ne" ? opt.ne : opt.en}
                </button>
              );
            })}
          </div>
        </Field>

        {isBusiness && (
          <>
            <Field label={t("elig.businessName")}>
              <input
                style={inputStyle}
                type="text"
                placeholder={t("elig.businessNamePlaceholder")}
                value={data.businessName || ""}
                onChange={(e) => setData({ ...data, businessName: e.target.value })}
              />
            </Field>
            <Field label={t("elig.businessType")}>
              <select
                style={inputStyle}
                value={data.businessType || ""}
                onChange={(e) => setData({ ...data, businessType: e.target.value })}
              >
                <option value="">{t("elig.selectBusinessType")}</option>
                {BUSINESS_TYPES.map((b) => (
                  <option key={b.en} value={b.en}>{lang === "ne" ? b.ne : b.en}</option>
                ))}
              </select>
            </Field>
            <Field label={t("elig.registrationNumber")}>
              <input
                style={inputStyle}
                type="text"
                placeholder={t("elig.registrationPlaceholder")}
                value={data.registrationNo || ""}
                onChange={(e) => setData({ ...data, registrationNo: e.target.value })}
              />
            </Field>
            <Field label={t("elig.businessSince")}>
              <input
                style={inputStyle}
                type="date"
                value={data.businessSince || ""}
                max={new Date().toISOString().split("T")[0]}
                onChange={(e) => setData({ ...data, businessSince: e.target.value })}
              />
              {data.businessSince && businessAgeYears(data.businessSince) < 1 && (
                <span style={{ display: "block", marginTop: 6, fontFamily: fontBody, fontSize: 11, color: C.danger }}>
                  {t("elig.businessAgeError")}
                </span>
              )}
              <span style={{ display: "block", marginTop: 6, fontFamily: fontBody, fontSize: 11, color: C.inkSoft }}>
                {t("elig.businessAgeNote")}
              </span>
            </Field>
          </>
        )}

        <Field label={isBusiness ? t("elig.annualTurnover") : t("elig.monthlyIncome")}>
          <input
            style={inputStyle}
            type="number"
            placeholder={isBusiness ? t("elig.turnoverPlaceholder") : t("elig.incomePlaceholder")}
            value={data.income}
            onChange={(e) => setData({ ...data, income: e.target.value })}
          />
          {isBusiness && (
            <span style={{ display: "block", marginTop: 6, fontFamily: fontBody, fontSize: 11, color: C.inkSoft }}>
              {t("elig.turnoverRangeNote")}
            </span>
          )}
        </Field>
        <Field label={t("elig.age")}>
          <input
            style={inputStyle}
            type="number"
            placeholder={t("elig.agePlaceholder")}
            value={data.age}
            onChange={(e) => setData({ ...data, age: e.target.value })}
          />
        </Field>
        <Field label={t("elig.city")}>
          <select
            style={inputStyle}
            value={data.city}
            onChange={(e) => setData({ ...data, city: e.target.value })}
          >
            <option value="">{t("elig.selectCity")}</option>
            {NEPAL_CITIES.map((c) => (
              <option key={c.en} value={c.en}>{lang === "ne" ? c.ne : c.en}</option>
            ))}
          </select>
        </Field>
        <p style={{ fontFamily: fontBody, fontSize: 11.5, color: C.inkSoft, lineHeight: 1.5 }}>
          {t("elig.disclaimer")}
        </p>
      </div>
      <BottomBar>
        <PrimaryButton disabled={!valid} onClick={() => go("offers")}>
          {t("elig.seeOffers")}
        </PrimaryButton>
      </BottomBar>
    </div>
  );
}

function DirectoryScreen({ go }) {
  const t = useT();
  const [tab, setTab] = useState("A");
  const active = NEPAL_BFI_DIRECTORY[tab];
  return (
    <div className="flex flex-col h-full" style={{ background: C.bg }}>
      <StatusBar />
      <AppBar title={t("dir.title")} onBack={() => go("home")} />
      <p className="px-5 pb-3" style={{ fontFamily: fontBody, fontSize: 11.5, color: C.inkSoft, lineHeight: 1.5 }}>
        {t("dir.desc")}
      </p>
      <div className="px-5 pb-3 flex gap-1.5 overflow-x-auto">
        {Object.keys(NEPAL_BFI_DIRECTORY).map((key) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="px-3 py-1.5 shrink-0"
            style={{
              fontFamily: fontBody, fontWeight: 600, fontSize: 11.5, borderRadius: 999,
              border: `1px solid ${tab === key ? C.brand : C.line}`,
              background: tab === key ? C.brand : "transparent",
              color: tab === key ? "#fff" : C.inkSoft,
              whiteSpace: "nowrap",
            }}
          >
            {t("dir.class", key)}
          </button>
        ))}
      </div>
      <div className="px-5 pb-2" style={{ fontFamily: fontBody, fontSize: 12, fontWeight: 600, color: C.ink }}>
        {t(active.labelKey)}
        <span style={{ fontWeight: 400, color: C.inkSoft }}> · {active.sub.split("·")[1]}</span>
      </div>
      <div className="flex-1 overflow-y-auto px-5 pb-4">
        {active.items.map((name, i) => (
          <div
            key={name}
            className="flex items-center gap-3 py-2.5"
            style={{ borderTop: i === 0 ? "none" : `1px solid ${C.line}`, fontFamily: fontBody }}
          >
            <div className="w-7 h-7 flex items-center justify-center shrink-0" style={{ background: C.panel, borderRadius: 8 }}>
              <Building2 size={13} color={C.brand} />
            </div>
            <span style={{ fontSize: 12.5, color: C.ink, lineHeight: 1.3 }}>{name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function OffersScreen({ go, amount, selectLender }) {
  const t = useT();
  const [sort, setSort] = useState("rate");
  const list = useMemo(() => {
    const arr = [...LENDERS];
    if (sort === "rate") arr.sort((a, b) => a.rate - b.rate);
    if (sort === "speed") arr.sort((a, b) => a.days - b.days);
    return arr;
  }, [sort]);

  return (
    <div className="flex flex-col h-full" style={{ background: C.bg }}>
      <StatusBar />
      <AppBar title={t("offers.title")} onBack={() => go("eligibility")} />
      <Progress step={2} total={3} />
      <div className="px-5 pt-4 pb-2 flex gap-2">
        {[{ k: "rate", labelKey: "offers.lowestInterest" }, { k: "speed", labelKey: "offers.fastestPayout" }].map((s) => (
          <button
            key={s.k}
            onClick={() => setSort(s.k)}
            className="px-3 py-1.5 text-xs"
            style={{
              fontFamily: fontBody, fontWeight: 500, borderRadius: 999,
              border: `1px solid ${sort === s.k ? C.brand : C.line}`,
              background: sort === s.k ? C.brand : "transparent",
              color: sort === s.k ? "#fff" : C.inkSoft,
            }}
          >
            {t(s.labelKey)}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-5 pt-2">
        <p style={{ fontFamily: fontBody, fontSize: 12, color: C.inkSoft, marginBottom: 10 }}>
          {t("offers.count", list.length, inr(amount))}
        </p>
        {list.map((l) => (
          <button
            key={l.id}
            onClick={() => { selectLender(l); go("calculator"); }}
            className="w-full text-left mb-3 p-4"
            style={{ background: C.panel, borderRadius: 14, display: "block" }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 flex items-center justify-center" style={{ background: C.brandDeep, borderRadius: 10 }}>
                  <Building2 size={16} color={C.gold} />
                </div>
                <div>
                  <div style={{ fontFamily: fontHead, fontWeight: 600, fontSize: 14.5, color: C.ink }}>{l.name}</div>
                  <div className="flex items-center gap-1" style={{ fontFamily: fontBody, fontSize: 11, color: C.inkSoft }}>
                    <Star size={11} fill={C.gold} color={C.gold} /> {l.rating}
                  </div>
                </div>
              </div>
              <ChevronRight size={18} color={C.inkSoft} />
            </div>
            <div className="grid grid-cols-3 gap-2" style={{ fontFamily: fontBody }}>
              <div>
                <div style={{ fontSize: 10.5, color: C.inkSoft }}>{t("offers.interest")}</div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: C.ink }}>{l.rate}% p.a.</div>
              </div>
              <div>
                <div style={{ fontSize: 10.5, color: C.inkSoft }}>{t("offers.serviceCharge")}</div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: C.ink }}>{l.fee}%</div>
              </div>
              <div>
                <div style={{ fontSize: 10.5, color: C.inkSoft }}>{t("offers.payoutIn")}</div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: C.ink }}>{t("offers.day", l.days)}</div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function CalculatorScreen({ go, amount, setAmount, tenure, setTenure, lender, isBusiness, isIncomeCapped, income, businessSince }) {
  const t = useT();
  const emi = emiFor(amount, lender.rate, tenure);
  const totalPayable = emi * tenure;
  const totalInterest = totalPayable - amount;
  const isQuickPayout = amount <= 25000;
  const NRB_MSME_CAP = 1000000;

  let sliderMax = isBusiness ? NRB_MSME_CAP : lender.maxAmt;

  if (isBusiness && businessSince && income > 0) {
    const ageYears = businessAgeYears(businessSince);
    const turnoverCapPct = businessTurnoverCapPct(ageYears);
    const turnoverCapAmount = income * turnoverCapPct;
    const roundedTurnoverCap = Math.floor(turnoverCapAmount / 5000) * 5000;
    sliderMax = Math.min(NRB_MSME_CAP, Math.max(roundedTurnoverCap, 5000));
  }

  if (isIncomeCapped && income > 0) {
    const emiCapPct = salariedEmiCapPct(income);
    const emiCapAmount = income * emiCapPct;
    const maxPrincipalForCap = Math.floor(principalForEmi(emiCapAmount, lender.rate, tenure) / 5000) * 5000;
    sliderMax = Math.min(sliderMax, Math.max(maxPrincipalForCap, 5000));
  }

  React.useEffect(() => {
    if (amount > sliderMax) setAmount(sliderMax);
  }, [sliderMax]);

  const chartData = [
    { name: "Principal", value: amount },
    { name: "Interest", value: totalInterest },
  ];

  return (
    <div className="flex flex-col h-full" style={{ background: C.bg }}>
      <StatusBar />
      <AppBar title={lender.name} onBack={() => go("offers")} />
      <div className="flex-1 overflow-y-auto px-5 pt-2">
        <div className="flex justify-center py-2">
          <div style={{ position: "relative", width: 168, height: 168 }}>
            <PieChart width={168} height={168}>
              <Pie data={chartData} dataKey="value" innerRadius={58} outerRadius={80} startAngle={90} endAngle={-270} stroke="none">
                <Cell fill={C.brand} />
                <Cell fill={C.gold} />
              </Pie>
            </PieChart>
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontFamily: fontBody, fontSize: 10.5, color: C.inkSoft }}>{t("calc.monthlyEmi")}</span>
              <span style={{ fontFamily: fontHead, fontWeight: 700, fontSize: 20, color: C.ink, fontVariantNumeric: "tabular-nums" }}>
                {inr(emi)}
              </span>
            </div>
          </div>
        </div>
        <div className="flex justify-center gap-5 mb-6" style={{ fontFamily: fontBody, fontSize: 12 }}>
          <span className="flex items-center gap-1.5" style={{ color: C.inkSoft }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: C.brand, display: "inline-block" }} /> {t("calc.principal")} {inr(amount)}
          </span>
          <span className="flex items-center gap-1.5" style={{ color: C.inkSoft }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: C.gold, display: "inline-block" }} /> {t("calc.interest")} {inr(totalInterest)}
          </span>
        </div>

        <div className="p-4 mb-4" style={{ background: C.panel, borderRadius: 14 }}>
          <div className="flex items-baseline justify-between mb-2">
            <span style={{ fontFamily: fontBody, fontSize: 12.5, color: C.inkSoft }}>{t("calc.loanAmount")}</span>
            <span style={{ fontFamily: fontHead, fontWeight: 600, fontSize: 16, color: C.ink, fontVariantNumeric: "tabular-nums" }}>{inr(amount)}</span>
          </div>
          <input type="range" min={5000} max={sliderMax} step={5000} value={amount}
            onChange={(e) => setAmount(Number(e.target.value))} className="w-full" style={{ accentColor: C.brand }} />
          {isQuickPayout && (
            <div className="flex items-center gap-1.5 mt-3">
              <Zap size={13} color={C.brandDeep} />
              <span style={{ fontFamily: fontBody, fontSize: 11.5, fontWeight: 600, color: C.brandDeep }}>
                {t("calc.instantEligible")}
              </span>
            </div>
          )}
        </div>

        <div className="p-4 mb-4" style={{ background: C.panel, borderRadius: 14 }}>
          <div className="flex items-baseline justify-between mb-2">
            <span style={{ fontFamily: fontBody, fontSize: 12.5, color: C.inkSoft }}>{t("calc.tenure")}</span>
            <span style={{ fontFamily: fontHead, fontWeight: 600, fontSize: 16, color: C.ink }}>{t("calc.months", tenure)}</span>
          </div>
          <input type="range" min={3} max={60} step={3} value={tenure}
            onChange={(e) => setTenure(Number(e.target.value))} className="w-full" style={{ accentColor: C.brand }} />
        </div>

        <div className="flex justify-between py-2" style={{ borderTop: `1px solid ${C.line}`, fontFamily: fontBody, fontSize: 13 }}>
          <span style={{ color: C.inkSoft }}>{t("calc.payoutTime")}</span>
          <span style={{ color: isQuickPayout ? C.brand : C.ink, fontWeight: 600 }}>
            {isQuickPayout ? t("calc.instantWithinMinutes") : t("calc.businessDays", lender.days)}
          </span>
        </div>
        <div className="flex justify-between py-2" style={{ borderTop: `1px solid ${C.line}`, fontFamily: fontBody, fontSize: 13 }}>
          <span style={{ color: C.inkSoft }}>{t("calc.interestRate")}</span>
          <span style={{ color: C.ink, fontWeight: 600 }}>{lender.rate}% p.a.</span>
        </div>
        <div className="flex justify-between py-2" style={{ borderTop: `1px solid ${C.line}`, fontFamily: fontBody, fontSize: 13 }}>
          <span style={{ color: C.inkSoft }}>{t("calc.totalPayable")}</span>
          <span style={{ color: C.ink, fontWeight: 600 }}>{inr(totalPayable)}</span>
        </div>
        <div className="flex justify-between py-2 mb-2" style={{ borderTop: `1px solid ${C.line}`, borderBottom: `1px solid ${C.line}`, fontFamily: fontBody, fontSize: 13 }}>
          <span style={{ color: C.inkSoft }}>{t("calc.serviceCharge")}</span>
          <span style={{ color: C.ink, fontWeight: 600 }}>{lender.fee}{t("calc.ofLoanAmount")}</span>
        </div>
        <button
          onClick={() => go("repayment")}
          className="w-full flex items-center justify-between py-3 mb-4"
          style={{ fontFamily: fontBody, fontSize: 13, fontWeight: 600, color: C.brand }}
        >
          {t("calc.viewSchedule")}
          <ChevronRight size={16} />
        </button>
      </div>
      <BottomBar>
        <PrimaryButton onClick={() => go("kyc")}>{t("calc.continueWith", lender.name)}</PrimaryButton>
      </BottomBar>
    </div>
  );
}

function RepaymentScheduleScreen({ go, amount, tenure, lender }) {
  const t = useT();
  const schedule = amortizationSchedule(amount, lender.rate, tenure);
  return (
    <div className="flex flex-col h-full" style={{ background: C.bg }}>
      <StatusBar />
      <AppBar title={t("repay.title")} onBack={() => go("calculator")} />
      <div className="px-5 pb-2" style={{ fontFamily: fontBody, fontSize: 12, color: C.inkSoft }}>
        {t("repay.subtitle", tenure, inr(amount), lender.rate, lender.name)}
      </div>
      <div className="px-5 pb-2 flex items-center" style={{ fontFamily: fontBody, fontSize: 10.5, fontWeight: 600, color: C.inkSoft, textTransform: "uppercase", letterSpacing: "0.02em" }}>
        <span style={{ width: 34 }}>#</span>
        <span className="flex-1">{t("repay.emi")}</span>
        <span className="flex-1 text-right">{t("repay.principal")}</span>
        <span className="flex-1 text-right">{t("repay.interest")}</span>
        <span className="flex-1 text-right">{t("repay.balance")}</span>
      </div>
      <div className="flex-1 overflow-y-auto px-5">
        {schedule.map((row) => (
          <div
            key={row.month}
            className="flex items-center py-2.5"
            style={{ borderTop: `1px solid ${C.line}`, fontFamily: fontBody, fontSize: 12, color: C.ink, fontVariantNumeric: "tabular-nums" }}
          >
            <span style={{ width: 34, color: C.inkSoft }}>{row.month}</span>
            <span className="flex-1">{inr(row.emi)}</span>
            <span className="flex-1 text-right">{inr(row.principalPaid)}</span>
            <span className="flex-1 text-right">{inr(row.interest)}</span>
            <span className="flex-1 text-right" style={{ fontWeight: 600 }}>{inr(row.balance)}</span>
          </div>
        ))}
      </div>
      <BottomBar>
        <PrimaryButton onClick={() => go("kyc")}>{t("calc.continueWith", lender.name)}</PrimaryButton>
      </BottomBar>
    </div>
  );
}

function KycScreen({ go, kyc, setKyc, isBusiness, lender }) {
  const t = useT();
  const valid = kyc.name && kyc.citizenshipNo && kyc.nid && kyc.nid.length === 10 && kyc.pan && kyc.phone && kyc.bankName && kyc.bank && kyc.consent && (!isBusiness || (
    kyc.taxClearanceFile && kyc.firmRegistrationFile && kyc.citizenshipFile && kyc.panCertificateFile && kyc.auditReportFile
  ));
  return (
    <div className="flex flex-col h-full" style={{ background: C.bg }}>
      <StatusBar />
      <AppBar title={t("kyc.title")} onBack={() => go("calculator")} />
      <Progress step={3} total={3} />
      <div className="flex-1 overflow-y-auto px-5 pt-5">
        <Field label={t("kyc.fullName")}>
          <input style={inputStyle} value={kyc.name} onChange={(e) => setKyc({ ...kyc, name: e.target.value })} placeholder={t("kyc.namePlaceholder")} />
        </Field>
        <Field label={t("kyc.citizenshipNumber")}>
          <input style={inputStyle} value={kyc.citizenshipNo} onChange={(e) => setKyc({ ...kyc, citizenshipNo: e.target.value })} placeholder={t("kyc.citizenshipPlaceholder")} maxLength={20} />
        </Field>
        <Field label={t("kyc.nidNumber")}>
          <input
            style={inputStyle}
            value={kyc.nid}
            onChange={(e) => setKyc({ ...kyc, nid: e.target.value.replace(/\D/g, "").slice(0, 10) })}
            placeholder={t("kyc.nidPlaceholder")}
            inputMode="numeric"
            maxLength={10}
          />
          {kyc.nid && kyc.nid.length < 10 && (
            <span style={{ display: "block", marginTop: 6, fontFamily: fontBody, fontSize: 11, color: C.danger }}>
              {t("kyc.nidTooShort")}
            </span>
          )}
        </Field>
        <Field label={t("kyc.panNumber")}>
          <input style={inputStyle} value={kyc.pan} onChange={(e) => setKyc({ ...kyc, pan: e.target.value })} placeholder={t("kyc.panPlaceholder")} maxLength={9} />
        </Field>
        <Field label={t("kyc.mobileNumber")}>
          <input style={inputStyle} value={kyc.phone} onChange={(e) => setKyc({ ...kyc, phone: e.target.value })} placeholder={t("kyc.mobilePlaceholder")} maxLength={10} />
        </Field>
        <Field label={t("kyc.bankName")}>
          <select
            style={inputStyle}
            value={kyc.bankName}
            onChange={(e) => setKyc({ ...kyc, bankName: e.target.value })}
          >
            <option value="">{t("kyc.selectBank")}</option>
            {NEPAL_BFI_DIRECTORY.A.items.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </Field>
        <Field label={t("kyc.bankAccount")}>
          <input style={inputStyle} value={kyc.bank} onChange={(e) => setKyc({ ...kyc, bank: e.target.value })} placeholder={t("kyc.accountPlaceholder")} />
        </Field>
        {isBusiness && (
          <>
            <DocUploadField
              label={t("kyc.firmRegistration")}
              value={kyc.firmRegistrationFile}
              onChange={(name) => setKyc({ ...kyc, firmRegistrationFile: name })}
            />
            <DocUploadField
              label={t("kyc.citizenshipDoc")}
              value={kyc.citizenshipFile}
              onChange={(name) => setKyc({ ...kyc, citizenshipFile: name })}
            />
            <DocUploadField
              label={t("kyc.panCertificate")}
              value={kyc.panCertificateFile}
              onChange={(name) => setKyc({ ...kyc, panCertificateFile: name })}
            />
            <DocUploadField
              label={t("kyc.auditReport")}
              value={kyc.auditReportFile}
              onChange={(name) => setKyc({ ...kyc, auditReportFile: name })}
            />
            <DocUploadField
              label={t("kyc.taxClearance")}
              value={kyc.taxClearanceFile}
              onChange={(name) => setKyc({ ...kyc, taxClearanceFile: name })}
              note={t("kyc.taxClearanceNote")}
            />
          </>
        )}
        <div className="flex gap-2 mb-2 p-3" style={{ background: C.panel, borderRadius: 10 }}>
          <FileCheck2 size={16} color={C.brand} className="shrink-0 mt-0.5" />
          <span style={{ fontFamily: fontBody, fontSize: 11.5, color: C.inkSoft, lineHeight: 1.5 }}>
            {t("kyc.verifyNote")}
          </span>
        </div>
        <label className="flex items-start gap-2 mt-2 mb-4">
          <input type="checkbox" checked={kyc.consent} onChange={(e) => setKyc({ ...kyc, consent: e.target.checked })} className="mt-1" style={{ accentColor: C.brand }} />
          <span style={{ fontFamily: fontBody, fontSize: 12, color: C.inkSoft, lineHeight: 1.5 }}>
            {t("kyc.consent", lender.name)}
          </span>
        </label>
      </div>
      <BottomBar>
        <PrimaryButton disabled={!valid} onClick={() => go("status")}>{t("kyc.submit")}</PrimaryButton>
      </BottomBar>
    </div>
  );
}

function StatusScreen({ go, lender, amount }) {
  const t = useT();
  const refId = "SA" + Math.floor(100000 + Math.random() * 900000);
  const isQuickPayout = amount <= 25000;
  const steps = [
    ["status.stepReceived", true],
    ["status.stepIdentity", false],
    ["status.stepApproval", false],
    ["status.stepDisbursed", false],
  ];
  return (
    <div className="flex flex-col h-full" style={{ background: C.bg }}>
      <StatusBar />
      <div className="flex-1 overflow-y-auto px-5 pt-6 flex flex-col items-center text-center">
        <div className="w-16 h-16 flex items-center justify-center mb-4" style={{ background: C.brand, borderRadius: "50%" }}>
          <CheckCircle2 size={32} color="#fff" />
        </div>
        <h1 style={{ fontFamily: fontHead, fontWeight: 700, fontSize: 22, color: C.ink }}>{t("status.submitted")}</h1>
        <p style={{ fontFamily: fontBody, fontSize: 13.5, color: C.inkSoft, marginTop: 6, lineHeight: 1.5 }}>
          {t("status.reviewing", lender.name, inr(amount))} <span style={{ fontWeight: 600, color: C.ink }}>{refId}</span>
        </p>

        <div className="w-full mt-7 text-left">
          {steps.map(([labelKey, done], i, arr) => (
            <div key={labelKey} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="flex items-center justify-center shrink-0" style={{
                  width: 22, height: 22, borderRadius: "50%",
                  background: done ? C.brand : "#fff", border: `2px solid ${done ? C.brand : C.line}`,
                }}>
                  {done && <CheckCircle2 size={13} color="#fff" />}
                </div>
                {i < arr.length - 1 && <div style={{ width: 2, flex: 1, background: C.line, minHeight: 26 }} />}
              </div>
              <div className="pb-6">
                <div style={{ fontFamily: fontBody, fontWeight: 600, fontSize: 13.5, color: done ? C.ink : C.inkSoft }}>{t(labelKey)}</div>
                {i === 0 && <div style={{ fontFamily: fontBody, fontSize: 11.5, color: C.inkSoft }}>{t("status.justNow")}</div>}
                {i === 1 && <div style={{ fontFamily: fontBody, fontSize: 11.5, color: C.inkSoft }}>{t("status.usuallyMinutes")}</div>}
              </div>
            </div>
          ))}
        </div>

        <div className="w-full flex items-center gap-2 p-3 mb-4" style={{ background: C.panel, borderRadius: 12 }}>
          <Landmark size={16} color={C.brand} />
          <span style={{ fontFamily: fontBody, fontSize: 11.5, color: C.inkSoft, textAlign: "left" }}>
            {isQuickPayout ? t("status.instantDisbursalNote") : t("status.normalDisbursalNote", lender.days)}
          </span>
        </div>
      </div>
      <BottomBar>
        <PrimaryButton onClick={() => go("home")} style={{ background: C.panel, color: C.ink }}>
          {t("status.backToHome")}
        </PrimaryButton>
      </BottomBar>
    </div>
  );
}

/* ---------------------------------------------------------
   Root
--------------------------------------------------------- */

export default function SaathiApp() {
  const [lang, setLang] = useState("en");
  const [screen, setScreen] = useState("home");
  const [amount, setAmount] = useState(150000);
  const [instantMode, setInstantMode] = useState(false);
  const [tenure, setTenure] = useState(24);
  const [lender, setLender] = useState(LENDERS[0]);
  const [elig, setElig] = useState({ employment: "Salaried", income: "", age: "", city: "", businessName: "", businessType: "" });
  const [kyc, setKyc] = useState({ name: "", citizenshipNo: "", nid: "", pan: "", phone: "", bankName: "", bank: "", taxClearanceFile: "", firmRegistrationFile: "", citizenshipFile: "", panCertificateFile: "", auditReportFile: "", consent: false });

  const screens = {
    home: <HomeScreen go={setScreen} amount={amount} setAmount={setAmount} setElig={setElig} setInstantMode={setInstantMode} />,
    eligibility: <EligibilityScreen go={setScreen} data={elig} setData={setElig} instantMode={instantMode} />,
    offers: <OffersScreen go={setScreen} amount={amount} selectLender={setLender} />,
    directory: <DirectoryScreen go={setScreen} />,
    calculator: <CalculatorScreen go={setScreen} amount={amount} setAmount={setAmount} tenure={tenure} setTenure={setTenure} lender={lender} isBusiness={elig.employment === "Small Business"} isIncomeCapped={elig.employment === "Salaried" || elig.employment === "Self-employed"} income={Number(elig.income) || 0} businessSince={elig.businessSince} />,
    repayment: <RepaymentScheduleScreen go={setScreen} amount={amount} tenure={tenure} lender={lender} />,
    kyc: <KycScreen go={setScreen} kyc={kyc} setKyc={setKyc} isBusiness={elig.employment === "Small Business"} lender={lender} />,
    status: <StatusScreen go={setScreen} lender={lender} amount={amount} />,
  };

  return (
    <LangContext.Provider value={{ lang, setLang }}>
      <div className="saathi-outer" style={{ fontFamily: fontBody }}>
        <div className="saathi-shell">
          {screens[screen]}
        </div>
      </div>
    </LangContext.Provider>
  );
}
