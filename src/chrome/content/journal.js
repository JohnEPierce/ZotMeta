Journal = {

    isObject(obj) {
        return obj !== null && typeof obj === 'object';
    },

    generateAuthors (authors) {
        var newAuthorList = [];
        if (authors) {
            authors.forEach(author => {
                newAuthorList.push(
                    {
                        "firstName": author["given"],
                        "lastName": author["family"],
                        "creatorType": "author"
                    }
                )
            });
        }
        return newAuthorList;
    },

    generateDate (date) {
        if (!date) {
            return null;
        }
        if (date.length > 0) {
            return date[0].join("-");
        }
        else {
            return null;
        }
    },

    getMetaData (item) {
        var doi = item.getField('DOI');
        if (item.itemTypeID !== Zotero.ItemTypes.getID('journalArticle')) {
            // Utilities.publishError("Unsupported Item Type", "Only Journal Article is supported.")
            return null;
        }
        if (!doi) {
            // Utilities.publishError("DOI not found", "DOI is required to retrieve metadata.")
            return null;
        }

        var url = 'https://api.crossref.org/works/' + doi;
        // const headers = new Headers({'Accept': 'application/vnd.citationstyles.csl+json'});
        var requestInfo = { method: 'GET' };
        return Utilities.fetchWithTimeout(url, requestInfo, 3000)
            .then(response => {
                if (!response.ok) {
                    Utilities.publishError("Error retrieving metadata", 
                        "Please check if DOI is correct and if you have network access to dx.doi.org.");
                    return null;
                        
                }
                return response.text()
            })
            .then(data => {
                try {
                    return JSON.parse(data)
                } catch (error) {
                    return null;
                }
            })
            .then(dataJson => {
                dataJson = dataJson.message;
                var Title = Utilities.safeGetFromJson(dataJson, ["title", 0]); if (this.isObject(Title)) Title = Title[0];
                var Authors = this.generateAuthors(Utilities.safeGetFromJson(dataJson, ["author"]));
                var Publication = Utilities.safeGetFromJson(dataJson, ["container-title"]); if (this.isObject(Publication)) Publication = Publication[0];
                var Volume = Utilities.safeGetFromJson(dataJson, ["volume"]);
                var Issue = Utilities.safeGetFromJson(dataJson, ["issue"]);
                var Pages = Utilities.safeGetFromJson(dataJson, ["page"]);
                var PublishDate = this.generateDate(Utilities.safeGetFromJson(dataJson, ["published", "date-parts"]));
                var JournalAbbr = Utilities.safeGetFromJson(dataJson, ["short-container-title"]); if (this.isObject(JournalAbbr)) JournalAbbr = JournalAbbr[0];
                var Language = Utilities.safeGetFromJson(dataJson, ["language"]);
                return {
                            "Title": Title ? Title : "",
                            "Authors": Authors ? Authors : "",
                            "Publication": Publication ? Publication : "",
                            "Volume": Volume ? Volume : "",
                            "Issue": Issue ? Issue : "",
                            "Pages": Pages ? Pages : "",
                            "PublishDate": PublishDate ? PublishDate : "",
                            "JournalAbbr": JournalAbbr ? JournalAbbr : "",
                            "Language": Language ? Language : ""
                        };
            });
    },
      
    async updateMetadata(item) {
        var metaData = await this.getMetaData(item);
        if (!metaData) {
            return 1;
        }
        
        if (!Utilities.isEmpty(metaData["Title"]))       item.setField('title',metaData["Title"]);
        if (!Utilities.isEmpty(metaData["Authors"]))     item.setCreators(metaData["Authors"]);
        if (!Utilities.isEmpty(metaData["Publication"])) item.setField('publicationTitle',metaData["Publication"]);
        if (!Utilities.isEmpty(metaData["Volume"]))      item.setField('volume',metaData["Volume"]);
        if (!Utilities.isEmpty(metaData["Issue"]))       item.setField('issue',metaData["Issue"]);
        if (!Utilities.isEmpty(metaData["Pages"]))       item.setField('pages',metaData["Pages"]);
        if (!Utilities.isEmpty(metaData["PublishDate"])) item.setField('date',metaData["PublishDate"]);
        if (!Utilities.isEmpty(metaData["JournalAbbr"])) item.setField('journalAbbreviation',metaData["JournalAbbr"]);
        if (!Utilities.isEmpty(metaData["Language"]))    item.setField('language',metaData["Language"]);
        await item.saveTx();
        return 0;
    }
}