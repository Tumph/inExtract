f = open("connections.rtf", "r")
people = {} # {"name":"description"}
pos = 1
curName = ""
for x in f:
    if(x == '\n'):
        continue
    if x == "Message\n":
        pos = 0
    if(pos == 3):
        curName = x.strip()
    if pos == 5:
        occupationList = x.split("|")
        temp = []
        for i in occupationList:
            if(i != "" and ("@" in i)):
                temp.append(i)
        occupationList = temp
        if(len(occupationList) > 0):
            people[curName] = occupationList




    pos+=1


people2 = {}
for i in people:
    temp = []
    for j in people[i]:
        j = j.split("@")
        tempJ = []
        for pos in range(len(j)):
            if(j[pos] != ""):
                if(j[pos][0] == " " or j[pos][0] == "\n"):
                    tempJ.append(j[pos][1:len(j[pos])-1])
                else:
                    tempJ.append(j[pos])
        temp.append(tempJ)
       
    people2[i] = temp




people = people2




import re
import numpy as np
import spacy
from sklearn.feature_extraction.text import TfidfVectorizer
from geotext import GeoText
import tensorflow as tf


# ----------------------------
# 1. Load spaCy model
# ----------------------------
# First run these commands in your terminal:
# pip install spacy
# python -m spacy download en_core_web_sm
nlp = spacy.load("en_core_web_sm")


# ----------------------------
# 2. Data Standardization
# ----------------------------
def standardize_entries(people):
    standardized = {}
    for name, entries in people.items():
        processed = []
        for entry in entries:
            parts = []
            for part in entry:
                tokens = re.split(r'[,/&()]', part.lower())
                tokens = [t.strip() for t in tokens if t.strip()]
                parts.extend(tokens)
            processed.append(parts)
        standardized[name] = processed
    return standardized






people_std = standardize_entries(people)
print(people_std)
# ----------------------------
# 3. Feature Engineering
# ----------------------------
def text_to_vec(text):
    doc = nlp(text)
    return doc.vector  # 96-dimensional vector


# Create text corpus
corpus = [' '.join([t for entry in entries for t in entry])
          for entries in people_std.values()]


# TF-IDF for key terms
tfidf = TfidfVectorizer(
    max_features=50,
    stop_words='english',
    vocabulary=['software', 'engineer', 'student', 'intern',
                'ai', 'machine', 'learning', 'computer']
)
tfidf_matrix = tfidf.fit_transform(corpus)


# spaCy embeddings
embedding_matrix = np.array([text_to_vec(text) for text in corpus])

