# RPL Super email

Please note this is a WIP. Test everything before use.

## TODOS

- Test, test, test


## Usage

Please make sure your run $ npm install

1. Drop your email inside the main folder and replace "images" and "index.html".
2. run $ gulp clean
3. run $ gulp
3. Edit the files inside the "dist/"
4. when ready run $ gulp zip
5. Upload Archive.zip



## Useful RLP functions

RIID encrypted : ${messagedigest(RIID_?c + 'tA0s', "MD5","hex")}

RIID : ${RIID_?c + "tA0s"}

Campaign Name : ${campaign.name}

Date : ${.now?string("yyyy")}

Terms : ${TERMS_CONDITIONS}

First name : ${CONTACTS_LIST.FIRST_NAME}