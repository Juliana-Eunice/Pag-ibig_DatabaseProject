package com.pagibig;

public class ContactRecord {
    private String pagibigId;
    private String cellNum;
    private String homeNum;
    private String businessDirect;
    private String businessTrunk;
    private String emailAddress;
    private String permAddress;
    private String presentAddress;
    private String prefMailAddress;

    public ContactRecord(String pagibigId, String cellNum, String homeNum, String businessDirect, String businessTrunk, String emailAddress, String permAddress, String presentAddress, String prefMailAddress) {
        this.pagibigId = pagibigId;
        this.cellNum = cellNum;
        this.homeNum = homeNum;
        this.businessDirect = businessDirect;
        this.businessTrunk = businessTrunk;
        this.emailAddress = emailAddress;
        this.permAddress = permAddress;
        this.presentAddress = presentAddress;
        this.prefMailAddress = prefMailAddress;
    }

    public String getPagibigId() {
        return pagibigId;
    }

    public void setPagibigId(String pagibigId) {
        this.pagibigId = pagibigId;
    }

    public String getCellNum() {
        return cellNum;
    }

    public void setCellNum(String cellNum) {
        this.cellNum = cellNum;
    }

    public String getHomeNum() {
        return homeNum;
    }

    public void setHomeNum(String homeNum) {
        this.homeNum = homeNum;
    }

    public String getBusinessDirect() {
        return businessDirect;
    }

    public void setBusinessDirect(String businessDirect) {
        this.businessDirect = businessDirect;
    }

    public String getBusinessTrunk() {
        return businessTrunk;
    }

    public void setBusinessTrunk(String businessTrunk) {
        this.businessTrunk = businessTrunk;
    }

    public String getEmailAddress() {
        return emailAddress;
    }

    public void setEmailAddress(String emailAddress) {
        this.emailAddress = emailAddress;
    }

    public String getPermAddress() {
        return permAddress;
    }

    public void setPermAddress(String permAddress) {
        this.permAddress = permAddress;
    }

    public String getPresentAddress() {
        return presentAddress;
    }

    public void setPresentAddress(String presentAddress) {
        this.presentAddress = presentAddress;
    }

    public String getPrefMailAddress() {
        return prefMailAddress;
    }

    public void setPrefMailAddress(String prefMailAddress) {
        this.prefMailAddress = prefMailAddress;
    }
}
