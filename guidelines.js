JFFGGuideLines = {};

// Create the Instance to hold the lines that will be used for guide lines
/*Guidel Lines Group Instance Path*/ JFFGGuideLines.MakeGuideLinesInstance = function()
{
    var mainHistID = FormIt.Model.GetHistoryID();
    // Create the guide lines History.
    var groupID = WSM.APICreateGroup(mainHistID, []);
    // Mark the new Group so we can find it later.
    WSM.Utils.SetOrCreateStringAttributeForObject(mainHistID, groupID, "JFFGGuideLinesGroup", "");
    // Mark the new History so we can find it later.
    var nGroupRefHistID = WSM.APIGetGroupReferencedHistoryReadOnly(mainHistID, groupID);
    
    WSM.Utils.SetOrCreateStringAttributeForObject(nGroupRefHistID, WSM.INVALID_ID, "JFFGGuideLinesGroup", "");

    // Put the instance on a Layer.
    var newLayerID = WSM.APICreateLayer(mainHistID, "JFFG Guide Lines", true /*bDisplayed*/);
    //console.log("newLayerID: " + JSON.stringify(newLayerID));
    var instances = WSM.APIGetObjectsByTypeReadOnly(mainHistID, groupID, WSM.nObjectType.nInstanceType);
    //console.log("new instance: " + JSON.stringify(instances));
    var guideLinesInstance = instances[0];
    // Set the Layer for the instance
    WSM.APIAddObjectsLayers(mainHistID, [newLayerID], guideLinesInstance);
    WSM.Utils.SetOrCreateStringAttributeForObject(mainHistID, guideLinesInstance, "JFFGGuideLinesGroup", "");

    // Return the path to the new instance.
    var guidelLinesObjectHistoryID = WSM.ObjectHistoryID(mainHistID, guideLinesInstance);
    var guidelLinesGroupInstancePath =  WSM.GroupInstancePath(guidelLinesObjectHistoryID);
    return guidelLinesGroupInstancePath;
}

// Get the guilde lines instance.  bMakeGuideLinesInstance indicates whether the instance 
// should be created if it doesn't exist.
/*Guidel Lines Group Instance Path*/ JFFGGuideLines.GetGuideLinesGroupInstancePath = function(bMakeGuideLinesInstance)
{
    var mainHistID = FormIt.Model.GetHistoryID();
    
    var objects = WSM.APIGetAllNonOwnedReadOnly(mainHistID);
    if (objects.length == 0)
    {
        return WSM.INVALID_ID;
    }

    // Try to find the existing guide lines instance
    var instances = WSM.APIGetAllObjectsByTypeReadOnly(mainHistID, WSM.nObjectType.nInstanceType);
    for (var i = 0; i < instances.length; ++i)
    {
        var guideLinesInstance = instances[i];
        var attribute = WSM.Utils.GetStringAttributeForObject(mainHistID, guideLinesInstance, "JFFGGuideLinesGroup");
        if (attribute.success)
        {
            // Return the path to the new instance.
            var guidelLinesObjectHistoryID = WSM.ObjectHistoryID(mainHistID, guideLinesInstance);
            var guidelLinesGroupInstancePath =  WSM.GroupInstancePath(guidelLinesObjectHistoryID);
            return guidelLinesGroupInstancePath;
        }
    }

    if (bMakeGuideLinesInstance)
    {
        // Didn't find the Instance, make it...
        return JFFGGuideLines.MakeGuideLinesInstance();
    }

    return WSM.INVALID_ID;
}

// Get the reference History ID of the Guilde Lines Instance
/*History ID*/ JFFGGuideLines.GetGuideLinesHistory = function()
{
    var guideLinesInstance = JFFGGuideLines.GetGuideLinesGroupInstancePath(false /*bMakeGuideLinesInstance*/);
    if (guideLinesInstance == WSM.INVALID_ID)
    {
        return WSM.INVALID_ID;
    }

    var ids = guideLinesInstance.ids[0];
    var hisjtoryID = ids.History;
    var instanceID = ids.Object;

    var refHistory = WSM.APIGetGroupReferencedHistoryReadOnly(hisjtoryID, instanceID);
    return refHistory;
}

// Returns true if editing in the Guide Lines Instance
/*bool*/ JFFGGuideLines.InGuideLinesInstance = function()
{
    var guideLinesInstance = JFFGGuideLines.GetGuideLinesGroupInstancePath(false /*bMakeGuideLinesInstance*/);
    if (guideLinesInstance == WSM.INVALID_ID)
    {
        return false;
    }

    var editContext = FormIt.GroupEdit.GetInContextEditingPath();
    return JSON.stringify(guideLinesInstance) == JSON.stringify(editContext);
}

// Start adding a guide line.
JFFGGuideLines.AddGuideLine = function()
{
    if (JFFGGuideLines.InGuideLinesInstance())
    {
        FormIt.UI.ShowNotification("Exited Guide Lines Creation.", FormIt.NotificationType.Information);

        if (WSM.GroupInstancePath.IsValid(JFFGGuideLines.m_OriginalEditContext))
            FormIt.GroupEdit.SetInContextEditingPath(JFFGGuideLines.m_OriginalEditContext);
        else
            FormIt.GroupEdit.EndEditInContext();
        return;
    }

    FormIt.UI.ShowNotification("Start making lines.  When finished click the AG button again.", FormIt.NotificationType.Information);

    // Cache the current context to switch back to.
    if (!JFFGGuideLines.InGuideLinesInstance())
    {
        JFFGGuideLines.m_OriginalEditContext = FormIt.GroupEdit.GetInContextEditingPath();
    }

    WSM.InferenceEngine.ClearCustomLineInferences();

    // Find the Guide Lines Instance and start editing it
    var guidelLinesGroupInstancePath = JFFGGuideLines.GetGuideLinesGroupInstancePath(true /*bMakeGuideLinesInstance*/);

    FormIt.GroupEdit.SetInContextEditingPath(guidelLinesGroupInstancePath);
    FormIt.Tools.StartTool(FormIt.ToolType.POLYLINE);
}
FormIt.Commands.RegisterJSCommand("JFFGGuideLines.AddGuideLine");

// New tool, need to set the guide lines on the inference engine.
JFFGGuideLines.ToolGotFocus = function(payload)
{
    var guideLinesInstance = JFFGGuideLines.GetGuideLinesGroupInstancePath(false /*bMakeGuideLinesInstance*/);
    var editContext = FormIt.GroupEdit.GetInContextEditingPath();

    // Don't apply inferences when editing the guide lines instance.
    if (WSM.GroupInstancePath.AreEqual(guideLinesInstance, editContext))
    {
        return;
    }

    // Gather all the edges and make custom line inferences.
    var guideLinesInstance = JFFGGuideLines.GetGuideLinesGroupInstancePath(false /*bMakeGuideLinesInstance*/);

    var hisjtoryID = JFFGGuideLines.GetGuideLinesHistory();
    var edges = WSM.APIGetAllObjectsByTypeReadOnly(hisjtoryID, WSM.nObjectType.nEdgeType);
    for (var i = 0; i < edges.length; ++i)
    {
        var edgePath = WSM.GroupInstancePath.AppendObjectHistoryID(guideLinesInstance, WSM.ObjectHistoryID(hisjtoryID, edges[i]));
        WSM.InferenceEngine.AddLineInferencesForObject(edgePath, true /*noLimit*/, true /*alwaysShowInference*/);
    }
}

// New tool, need to set the guide lines on the inference engine.
JFFGGuideLines.ClearGuideLines = function()
{
    WSM.InferenceEngine.ClearCustomLineInferences();
}
FormIt.Commands.RegisterJSCommand("JFFGGuideLines.ClearGuideLines");

// New tool, need to set the guide lines on the inference engine.
JFFGGuideLines.InContextEditing = function(payload)
{
    // Check if the instance exists so that if it doesn't, just bail.
    var guideLinesInstance = JFFGGuideLines.GetGuideLinesGroupInstancePath(false /*bMakeGuideLinesInstance*/);
    if (guideLinesInstance == WSM.INVALID_ID) return;

    var payloadStr = JSON.stringify(payload);
    var guideLinesInstanceStr = JSON.stringify(guideLinesInstance);

    var layerId = FormIt.Layers.GetLayerID("JFFG Guide Lines");
    if (layerId != WSM.INVALID_ID)
    {
        // If we are editing the guide lines instance, turn on the layer
        var layerData = FormIt.Layers.GetLayerData(layerId);
        layerData.Visible = payloadStr == guideLinesInstanceStr;
        FormIt.Layers.SetLayersVisibility(layerData);
    }
}

// New tool, need to set the guide lines on the inference engine.
JFFGGuideLines.Help = function()
{
    FormIt.OpenURL("https://github.com/jhauswirth/FormItGuideLines#readme");
}
FormIt.Commands.RegisterJSCommand("JFFGGuideLines.Help");

// Message handling

// Create a Message Listener that handles calling the subscribed message handlers.
if (!(JFFGGuideLines.hasOwnProperty("listener")))
{
    JFFGGuideLines.listener = FormIt.Messaging.NewMessageListener();
}

// Assign the msg handlers
JFFGGuideLines.listener["FormIt.Message.kToolGotFocus"] = function(payload) 
{
    JFFGGuideLines.ToolGotFocus(payload);
};

JFFGGuideLines.listener.SubscribeMessage("FormIt.Message.kToolGotFocus");

JFFGGuideLines.listener["FormIt.Message.kInContextEditing"] = function(payload)
{
    JFFGGuideLines.InContextEditing(payload);
};
JFFGGuideLines.listener.SubscribeMessage("FormIt.Message.kInContextEditing");

//TODO: Need File->New message to set JFFGGuideLines.m_OriginalEditContext to WSM.INVALID_ID
