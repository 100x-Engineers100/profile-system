import { LlamaParseReader } from "llamaindex";
import axios from "axios";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

interface WorkExperience {
  company: string;
  position: string;
  startDate: string;
  endDate: string;
  description: string;
  achievements: string[];
}

interface Education {
  institution: string;
  degree: string;
  field: string;
  startDate: string;
  endDate: string;
  gpa?: string;
}

interface Certification {
  name: string;
  issuer: string;
  date: string;
  expiryDate?: string;
}

interface ParsedResume {
  name: string;
  text: string;
  skills: string[];
  experience: string;
  education: Education[];
  workHistory: WorkExperience[];
  certifications: Certification[];
  languages: string[];
  contact: {
    email: string;
    phone?: string;
    location?: string;
    linkedin?: string;
    github?: string;
  };
}

export class ResumeParser {
  private reader: LlamaParseReader;

  constructor() {
    if (!process.env.LLAMA_CLOUD_API_KEY) {
      throw new Error("LLAMA_CLOUD_API_KEY is required");
    }

    this.reader = new LlamaParseReader({
      apiKey: process.env.LLAMA_CLOUD_API_KEY,
      resultType: "text",
    });
  }

  private async extractInformation(
    text: string
  ): Promise<Partial<ParsedResume>> {
    try {
      const response = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [
              {
                role: "system",
                content: `You are a resume parser. Extract structured information from the given resume text and return it in JSON format.
              
              Important guidelines:
              1. For full name: Look for the largest text at the top of the resume, or text that appears to be a name (usually in a larger font or at the top)
              2. For phone numbers: Look for patterns like (123) 456-7890, 123-456-7890, +1 123-456-7890, or international formats
              3. For work experience: 
                 - Extract each position as a separate entry in workHistory array
                 - Include company name, position, dates, and description
                 - Calculate total experience in years and months
                 - Include achievements as an array of strings
              4. For skills: Extract both technical and soft skills, including programming languages, tools, and methodologies`,
              },
              {
                role: "user",
                content: `
                Extract the following information from this resume text. Return the information in a structured format:

                Example format:
                {
                  "name": "John Doe",
                  "contact": {
                    "email": "john@example.com",
                    "phone": "+1 (123) 456-7890",
                    "location": "New York, NY",
                    "linkedin": "linkedin.com/in/johndoe",
                    "github": "github.com/johndoe"
                  },
                  "skills": ["JavaScript", "React", "Node.js"],
                  "experience": "5 years of software development experience",
                  "workHistory": [
                    {
                      "company": "Tech Corp",
                      "position": "Senior Developer",
                      "startDate": "2020-01",
                      "endDate": "Present",
                      "description": "Led development of web applications",
                      "achievements": [
                        "Reduced load time by 50%",
                        "Implemented CI/CD pipeline"
                      ]
                    }
                  ],
                  "education": [
                    {
                      "institution": "University of Technology",
                      "degree": "Bachelor of Science",
                      "field": "Computer Science",
                      "startDate": "2015-09",
                      "endDate": "2019-05",
                      "gpa": "3.8"
                    }
                  ],
                  "certifications": [
                    {
                      "name": "AWS Certified Developer",
                      "issuer": "Amazon Web Services",
                      "date": "2021-06"
                    }
                  ],
                  "languages": ["English", "Spanish"]
                }

                Resume text:
                ${text}

                Return the information in JSON format following the example above. Make sure to:
                1. Extract the full name from the top of the resume
                2. Find all phone numbers in various formats
                3. Calculate total work experience
                4. Include detailed work history with achievements
                5. Extract all skills mentioned
              `,
              },
            ],
            temperature: 0,
            max_tokens: 32768,
            response_format: { type: "json_object" },
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        // console.error("Groq API error:", errorData);
        throw new Error(
          `Groq API error: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();

      if (!data.choices?.[0]?.message?.content) {
        // console.error("Unexpected Groq API response format:", data);
        throw new Error("Unexpected response format from Groq API");
      }

      try {
        return JSON.parse(data.choices[0].message.content);
      } catch (parseError) {
        throw new Error("Invalid JSON response from Groq API");
      }
    } catch (error) {
      // console.error("Error extracting information:", error);
      return this.fallbackExtraction(text);
    }
  }

  private fallbackExtraction(text: string): Partial<ParsedResume> {
    // Basic regex-based extraction as fallback
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const phoneRegex =
      /(?:\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
    const linkedinRegex =
      /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[\w-]+/g;
    const githubRegex = /(?:https?:\/\/)?(?:www\.)?github\.com\/[\w-]+/g;

    const email = text.match(emailRegex)?.[0] || "";
    const phone = text.match(phoneRegex)?.[0];
    const linkedin = text.match(linkedinRegex)?.[0] || "";
    const github = text.match(githubRegex)?.[0] || "";

    return {
      name: "",
      text: text,
      skills: [],
      experience: "",
      education: [],
      workHistory: [],
      certifications: [],
      languages: [],
      contact: {
        email,
        phone,
        location: "",
        linkedin,
        github,
      },
    };
  }

  async parseResumeFromUrl(url: string): Promise<ParsedResume> {
    let tempFilePath: string | null = null;
    try {
      let pdfBuffer: Buffer;

      // Check if the URL is a file path or HTTP(S) URL
      if (url.startsWith("http://") || url.startsWith("https://")) {
        // Download the PDF from URL
        const response = await axios.get(url, { responseType: "arraybuffer" });
        pdfBuffer = Buffer.from(response.data);
      } else {
        // Read the file directly
        pdfBuffer = fs.readFileSync(url);
      }

      // Create a temporary file
      tempFilePath = path.join(os.tmpdir(), `resume-${Date.now()}.pdf`);
      fs.writeFileSync(tempFilePath, pdfBuffer);

      // Parse PDF using LlamaParseReader
      const documents = await this.reader.loadData(tempFilePath);
      const text = documents.map((doc) => doc.text).join("\n");

      // Extract information using Groq
      const extractedInfo = await this.extractInformation(text);

      // Create the parsed resume object
      return {
        name: extractedInfo.name || "",
        text: text,
        skills: extractedInfo.skills || [],
        experience: extractedInfo.experience || "",
        education: extractedInfo.education || [],
        workHistory: extractedInfo.workHistory || [],
        certifications: extractedInfo.certifications || [],
        languages: extractedInfo.languages || [],
        contact: {
          email: extractedInfo.contact?.email || "",
          phone: extractedInfo.contact?.phone,
          location: extractedInfo.contact?.location || "",
          linkedin: extractedInfo.contact?.linkedin || "",
          github: extractedInfo.contact?.github || "",
        },
      };
    } catch (error) {
      // console.error("Error parsing resume:", error);
      // Add more detailed error information
      if (error instanceof Error) {
        throw new Error(`Failed to parse resume: ${error.message}`);
      }
      throw new Error("Failed to parse resume");
    } finally {
      // Clean up temporary file
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    }
  }
}
